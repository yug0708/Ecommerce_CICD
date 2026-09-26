import { OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { env, isProd } from '../config/env.js';
import { fromStripeAmount, isStripeConfigured, stripe, toStripeAmount } from '../config/stripe.js';
import { prisma } from '../prisma/client.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { decimalToString } from '../utils/serialize.js';

function serializePayment(payment: {
  id: string;
  orderId: string;
  userId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  transactionId: string | null;
  providerRef: string | null;
  failureReason: string | null;
  metadata: Prisma.JsonValue | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...payment,
    amount: decimalToString(payment.amount)!,
  };
}

export type PaymentIntentResult = {
  payment: ReturnType<typeof serializePayment>;
  clientSecret: string;
  mode: 'stripe' | 'demo';
  publishableHint: 'Use your Stripe publishable key on the client';
};

async function restoreStockForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const productIds = [...new Set(items.map((i) => i.productId))].sort((a, b) =>
    a.localeCompare(b),
  );

  for (const productId of productIds) {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
  }

  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stockQuantity: { increment: item.quantity } },
    });
  }
}

async function markOrderPaid(orderId: string, note: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    if (order.status === OrderStatus.PAID) {
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      logger.warn({ orderId, status: order.status }, 'Skipping paid transition for non-pending order');
      return;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: OrderStatus.PAID,
            note,
          },
        },
      },
    });
  });
}

async function markOrderCancelledFromPayment(orderId: string, note: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    if (order.status === OrderStatus.CANCELLED) {
      return;
    }

    if (order.status === OrderStatus.DELIVERED) {
      logger.warn({ orderId }, 'Cannot cancel delivered order after refund');
      return;
    }

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.PENDING) {
      await restoreStockForOrder(tx, orderId);
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: OrderStatus.CANCELLED,
            note,
          },
        },
      },
    });
  });
}

/**
 * Creates (or reuses) a Stripe PaymentIntent for a PENDING order owned by the user.
 */
export async function createPaymentIntent(
  userId: string,
  orderId: string,
): Promise<PaymentIntentResult> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payment: true, user: { select: { email: true } } },
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new ValidationError(`Cannot pay for order in status ${order.status}`);
  }

  if (order.payment?.status === PaymentStatus.SUCCEEDED) {
    throw new ValidationError('Order is already paid');
  }

  const amountCents = toStripeAmount(order.total);
  if (amountCents < 50) {
    throw new ValidationError('Order total is below Stripe minimum charge amount');
  }

  const currency = env.STRIPE_CURRENCY.toLowerCase();

  if (!isStripeConfigured()) {
    if (isProd) {
      throw new ValidationError('Stripe is not configured');
    }
    return createDemoPaymentIntent(order, currency);
  }

  // Reuse open PaymentIntent when possible
  if (
    order.payment?.providerRef &&
    (order.payment.status === PaymentStatus.PENDING ||
      order.payment.status === PaymentStatus.REQUIRES_ACTION)
  ) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.payment.providerRef);
      if (
        existing.currency === currency &&
        (existing.status === 'requires_payment_method' ||
          existing.status === 'requires_confirmation' ||
          existing.status === 'requires_action')
      ) {
        if (!existing.client_secret) {
          throw new ValidationError('Stripe PaymentIntent is missing client_secret');
        }
        return {
          payment: serializePayment(order.payment),
          clientSecret: existing.client_secret,
          mode: 'stripe',
          publishableHint: 'Use your Stripe publishable key on the client',
        };
      }
    } catch (error) {
      logger.warn({ err: error, orderId }, 'Failed to reuse PaymentIntent; creating a new one');
    }
  }

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
      },
      receipt_email: order.user.email,
      description: `Order ${order.orderNumber}`,
    });
  } catch (error) {
    logger.error({ err: error, orderId }, 'Stripe PaymentIntent creation failed');
    throw new ValidationError('Unable to create Stripe payment intent', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }

  if (!paymentIntent.client_secret) {
    throw new ValidationError('Stripe did not return a client_secret');
  }

  const payment =
    order.payment != null
      ? await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.PENDING,
            amount: order.total,
            currency: currency.toUpperCase(),
            providerRef: paymentIntent.id,
            transactionId: null,
            failureReason: null,
            metadata: {
              paymentIntentId: paymentIntent.id,
              stripeStatus: paymentIntent.status,
            },
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.PENDING,
            amount: order.total,
            currency: currency.toUpperCase(),
            providerRef: paymentIntent.id,
            metadata: {
              paymentIntentId: paymentIntent.id,
              stripeStatus: paymentIntent.status,
            },
          },
        });

  return {
    payment: serializePayment(payment),
    clientSecret: paymentIntent.client_secret,
    mode: 'stripe',
    publishableHint: 'Use your Stripe publishable key on the client',
  };
}

async function createDemoPaymentIntent(
  order: {
    id: string;
    userId: string;
    total: Prisma.Decimal;
    payment: Parameters<typeof serializePayment>[0] | null;
  },
  currency: string,
): Promise<PaymentIntentResult> {
  const existingMeta =
    order.payment?.metadata && typeof order.payment.metadata === 'object'
      ? (order.payment.metadata as { demo?: boolean; clientSecret?: string })
      : null;

  if (
    order.payment &&
    existingMeta?.demo &&
    existingMeta.clientSecret &&
    (order.payment.status === PaymentStatus.PENDING ||
      order.payment.status === PaymentStatus.REQUIRES_ACTION)
  ) {
    return {
      payment: serializePayment(order.payment),
      clientSecret: existingMeta.clientSecret,
      mode: 'demo',
      publishableHint: 'Use your Stripe publishable key on the client',
    };
  }

  const intentId = `pi_dev_${crypto.randomUUID().replaceAll('-', '')}`;
  const clientSecret = `${intentId}_secret_${crypto.randomUUID().replaceAll('-', '')}`;
  const metadata = {
    demo: true,
    paymentIntentId: intentId,
    stripeStatus: 'requires_confirmation',
    clientSecret,
  };

  const payment =
    order.payment != null
      ? await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.PENDING,
            amount: order.total,
            currency: currency.toUpperCase(),
            providerRef: intentId,
            transactionId: null,
            failureReason: null,
            metadata,
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.PENDING,
            amount: order.total,
            currency: currency.toUpperCase(),
            providerRef: intentId,
            metadata,
          },
        });

  logger.info({ orderId: order.id }, 'Created local demo payment intent (Stripe keys are placeholders)');

  return {
    payment: serializePayment(payment),
    clientSecret,
    mode: 'demo',
    publishableHint: 'Use your Stripe publishable key on the client',
  };
}

export async function confirmDemoPayment(
  userId: string,
  orderId: string,
  clientSecret: string,
): Promise<{ orderId: string; payment: ReturnType<typeof serializePayment> }> {
  if (isProd || isStripeConfigured()) {
    throw new ValidationError('Demo checkout is only available in local development');
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payment: true },
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status === OrderStatus.PAID && order.payment) {
    return { orderId, payment: serializePayment(order.payment) };
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new ValidationError(`Cannot pay for order in status ${order.status}`);
  }

  if (!order.payment) {
    throw new ValidationError('Payment has not been initialized');
  }

  const meta =
    order.payment.metadata && typeof order.payment.metadata === 'object'
      ? (order.payment.metadata as { demo?: boolean; clientSecret?: string })
      : {};

  if (!meta.demo || meta.clientSecret !== clientSecret) {
    throw new ValidationError('Invalid demo payment secret');
  }

  const updated = await prisma.payment.update({
    where: { id: order.payment.id },
    data: {
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      failureReason: null,
      transactionId: `demo_${order.payment.providerRef ?? order.id}`,
      metadata: {
        ...meta,
        stripeStatus: 'succeeded',
      },
    },
  });

  await markOrderPaid(orderId, 'Payment succeeded (local demo checkout)');

  return { orderId, payment: serializePayment(updated) };
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const orderId = intent.metadata.orderId;
  if (!orderId) {
    logger.warn({ intentId: intent.id }, 'payment_intent.succeeded missing orderId metadata');
    return;
  }

  const chargeId =
    typeof intent.latest_charge === 'string'
      ? intent.latest_charge
      : intent.latest_charge?.id ?? null;

  await prisma.payment.updateMany({
    where: {
      OR: [{ providerRef: intent.id }, { orderId }],
    },
    data: {
      status: PaymentStatus.SUCCEEDED,
      transactionId: chargeId,
      providerRef: intent.id,
      paidAt: new Date(),
      failureReason: null,
      metadata: {
        paymentIntentId: intent.id,
        stripeStatus: intent.status,
        amountReceived: intent.amount_received,
      },
    },
  });

  // Ensure payment row exists (edge case)
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      await prisma.payment.create({
        data: {
          orderId,
          userId: order.userId,
          provider: PaymentProvider.STRIPE,
          status: PaymentStatus.SUCCEEDED,
          amount: fromStripeAmount(intent.amount_received || intent.amount),
          currency: intent.currency.toUpperCase(),
          providerRef: intent.id,
          transactionId: chargeId,
          paidAt: new Date(),
          metadata: { paymentIntentId: intent.id, stripeStatus: intent.status },
        },
      });
    }
  }

  await markOrderPaid(orderId, 'Payment succeeded (Stripe webhook)');
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const orderId = intent.metadata.orderId;
  const failureMessage =
    intent.last_payment_error?.message ?? 'Payment failed';

  await prisma.payment.updateMany({
    where: {
      OR: [
        { providerRef: intent.id },
        ...(orderId ? [{ orderId }] : []),
      ],
    },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: failureMessage,
      metadata: {
        paymentIntentId: intent.id,
        stripeStatus: intent.status,
        errorCode: intent.last_payment_error?.code ?? null,
      },
    },
  });

  if (orderId) {
    logger.warn({ intentId: intent.id, orderId, failureMessage }, 'Stripe payment failed');
  } else {
    logger.warn({ intentId: intent.id, failureMessage }, 'Stripe payment failed');
  }
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        ...(paymentIntentId ? [{ providerRef: paymentIntentId }] : []),
        ...(charge.id ? [{ transactionId: charge.id }] : []),
      ],
    },
  });

  if (!payment) {
    logger.warn({ chargeId: charge.id }, 'Refund webhook: payment not found');
    return;
  }

  const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: fullyRefunded ? PaymentStatus.REFUNDED : payment.status,
      metadata: {
        ...(typeof payment.metadata === 'object' && payment.metadata !== null
          ? (payment.metadata as object)
          : {}),
        amountRefunded: charge.amount_refunded,
        chargeId: charge.id,
      },
    },
  });

  if (fullyRefunded) {
    await markOrderCancelledFromPayment(
      payment.orderId,
      'Payment refunded (Stripe webhook)',
    );
  }
}

export async function constructStripeEvent(
  rawBody: Buffer,
  signature: string | string[] | undefined,
): Promise<Stripe.Event> {
  if (!signature || Array.isArray(signature)) {
    throw new ValidationError('Missing Stripe-Signature header');
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.warn({ err: error }, 'Stripe webhook signature verification failed');
    throw new ValidationError('Invalid Stripe webhook signature');
  }
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
  }
}

export async function refundPayment(
  adminUserId: string,
  paymentId: string,
  amount?: number,
): Promise<ReturnType<typeof serializePayment>> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.provider !== PaymentProvider.STRIPE) {
    throw new ValidationError('Only Stripe payments can be refunded via this endpoint');
  }

  if (payment.status !== PaymentStatus.SUCCEEDED) {
    throw new ValidationError(`Cannot refund payment in status ${payment.status}`);
  }

  if (!payment.providerRef) {
    throw new ValidationError('Payment is missing Stripe PaymentIntent reference');
  }

  const refundAmountCents =
    amount !== undefined ? toStripeAmount(amount) : toStripeAmount(payment.amount);

  if (refundAmountCents <= 0 || refundAmountCents > toStripeAmount(payment.amount)) {
    throw new ValidationError('Invalid refund amount');
  }

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: payment.providerRef,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        orderId: payment.orderId,
        refundedBy: adminUserId,
      },
    });
  } catch (error) {
    logger.error({ err: error, paymentId }, 'Stripe refund failed');
    throw new ValidationError('Stripe refund failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }

  const fullyRefunded = refundAmountCents >= toStripeAmount(payment.amount);

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: fullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.SUCCEEDED,
        metadata: {
          ...(typeof payment.metadata === 'object' && payment.metadata !== null
            ? (payment.metadata as object)
            : {}),
          lastRefundId: refund.id,
          lastRefundAmount: refund.amount,
          refundedBy: adminUserId,
        },
      },
    });

    if (fullyRefunded && payment.order.status !== OrderStatus.CANCELLED) {
      if (
        payment.order.status === OrderStatus.PAID ||
        payment.order.status === OrderStatus.PENDING
      ) {
        await restoreStockForOrder(tx, payment.orderId);
      }

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: payment.order.status,
              toStatus: OrderStatus.CANCELLED,
              note: `Admin refund (${refund.id})`,
              changedById: adminUserId,
            },
          },
        },
      });
    }

    return next;
  });

  return serializePayment(updated);
}

export async function getPaymentForUser(userId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
  });
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }
  return serializePayment(payment);
}
