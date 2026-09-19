import { OrderStatus, Prisma, type Coupon, type DiscountType } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { paginated } from '../utils/pagination.js';
import { decimalToString } from '../utils/serialize.js';
import type {
  CreateOrderInput,
  ListAdminOrdersQuery,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from '../validators/order.validators.js';

type LockedProduct = {
  id: string;
  name: string;
  sku: string;
  price: Prisma.Decimal;
  stock_quantity: number;
  is_active: boolean;
};

const orderInclude = {
  items: true,
  shippingAddress: true,
  billingAddress: true,
  coupon: { select: { id: true, code: true, discountType: true, discountValue: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    include: { changedBy: { select: { id: true, name: true, email: true } } },
  },
  payment: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return {
    ...order,
    subtotal: decimalToString(order.subtotal)!,
    tax: decimalToString(order.tax)!,
    shippingCost: decimalToString(order.shippingCost)!,
    discountAmount: decimalToString(order.discountAmount)!,
    total: decimalToString(order.total)!,
    items: order.items.map((item) => ({
      ...item,
      unitPrice: decimalToString(item.unitPrice)!,
      lineTotal: decimalToString(item.lineTotal)!,
    })),
    coupon: order.coupon
      ? {
          ...order.coupon,
          discountValue: decimalToString(order.coupon.discountValue)!,
        }
      : null,
    payment: order.payment
      ? {
          ...order.payment,
          amount: decimalToString(order.payment.amount)!,
        }
      : null,
  };
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${date}-${rand}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateDiscount(
  coupon: Coupon,
  subtotal: number,
): { discountAmount: number; discountType: DiscountType } {
  let discountAmount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
    if (coupon.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  discountAmount = Math.min(discountAmount, subtotal);
  return { discountAmount: roundMoney(discountAmount), discountType: coupon.discountType };
}

function calculateShipping(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount >= env.FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  return roundMoney(env.SHIPPING_FLAT_RATE);
}

function assertTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
    PAID: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    SHIPPED: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (!allowed[from].includes(to)) {
    throw new ValidationError(`Cannot transition order from ${from} to ${to}`);
  }
}

async function validateCoupon(code: string | undefined, userId: string, subtotal: number) {
  if (!code) return null;

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new ValidationError('Invalid coupon code');
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new ValidationError('Coupon is not active yet');
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new ValidationError('Coupon has expired');
  }
  if (coupon.minOrderAmount != null && subtotal < Number(coupon.minOrderAmount)) {
    throw new ValidationError('Order does not meet coupon minimum amount', {
      minOrderAmount: decimalToString(coupon.minOrderAmount),
    });
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new ValidationError('Coupon usage limit reached');
  }

  if (coupon.perUserLimit != null) {
    const userUses = await prisma.order.count({
      where: { userId, couponId: coupon.id, status: { not: OrderStatus.CANCELLED } },
    });
    if (userUses >= coupon.perUserLimit) {
      throw new ValidationError('You have already used this coupon the maximum number of times');
    }
  }

  return coupon;
}

export async function createOrderFromCart(userId: string, input: CreateOrderInput) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  const shippingAddress = await prisma.address.findFirst({
    where: { id: input.shippingAddressId, userId },
  });
  if (!shippingAddress) {
    throw new ValidationError('shippingAddressId is invalid for this user');
  }

  const billingAddressId = input.billingAddressId ?? input.shippingAddressId;
  const billingAddress = await prisma.address.findFirst({
    where: { id: billingAddressId, userId },
  });
  if (!billingAddress) {
    throw new ValidationError('billingAddressId is invalid for this user');
  }

  const order = await prisma.$transaction(
    async (tx) => {
      const lockedLines: Array<{
        productId: string;
        productName: string;
        productSku: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];

      let subtotal = 0;

      // Lock product rows in stable id order to reduce deadlock risk
      const sortedItems = [...cart.items].sort((a, b) => a.productId.localeCompare(b.productId));

      for (const item of sortedItems) {
        // Prisma tagged template — parameterized, not string interpolation
        const rows = await tx.$queryRaw<LockedProduct[]>`
          SELECT id, name, sku, price, stock_quantity, is_active
          FROM products
          WHERE id = ${item.productId}
          FOR UPDATE
        `;

        const product = rows[0];
        if (!product || !product.is_active) {
          throw new ValidationError(`Product ${item.productId} is unavailable`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new ValidationError(`Insufficient stock for ${product.name}`, {
            productId: product.id,
            available: product.stock_quantity,
            requested: item.quantity,
          });
        }

        const unitPrice = Number(product.price);
        const lineTotal = roundMoney(unitPrice * item.quantity);
        subtotal = roundMoney(subtotal + lineTotal);

        lockedLines.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }

      const coupon = input.couponCode
        ? await tx.coupon.findUnique({ where: { code: input.couponCode } })
        : null;

      if (input.couponCode) {
        // Re-validate inside transaction for concurrency on usedCount
        if (!coupon || !coupon.isActive) {
          throw new ValidationError('Invalid coupon code');
        }
        const now = new Date();
        if (coupon.startsAt && coupon.startsAt > now) {
          throw new ValidationError('Coupon is not active yet');
        }
        if (coupon.endsAt && coupon.endsAt < now) {
          throw new ValidationError('Coupon has expired');
        }
        if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
          throw new ValidationError('Coupon usage limit reached');
        }
        if (coupon.minOrderAmount != null && subtotal < Number(coupon.minOrderAmount)) {
          throw new ValidationError('Order does not meet coupon minimum amount');
        }
      }

      const { discountAmount } = coupon
        ? calculateDiscount(coupon, subtotal)
        : { discountAmount: 0 };

      const taxable = roundMoney(Math.max(subtotal - discountAmount, 0));
      const shippingCost = calculateShipping(taxable);
      const tax = roundMoney(taxable * env.TAX_RATE);
      const total = roundMoney(taxable + tax + shippingCost);

      // Deduct stock with optimistic guard (FOR UPDATE already held)
      for (const line of lockedLines) {
        const result = await tx.product.updateMany({
          where: {
            id: line.productId,
            stockQuantity: { gte: line.quantity },
          },
          data: {
            stockQuantity: { decrement: line.quantity },
          },
        });

        if (result.count !== 1) {
          throw new ValidationError(`Stock race detected for product ${line.productId}`);
        }
      }

      let created;
      let attempts = 0;
      while (attempts < 5) {
        attempts += 1;
        try {
          created = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId,
              status: OrderStatus.PENDING,
              subtotal,
              tax,
              shippingCost,
              discountAmount,
              total,
              notes: input.notes,
              shippingAddressId: shippingAddress.id,
              billingAddressId: billingAddress.id,
              couponId: coupon?.id,
              items: {
                create: lockedLines.map((line) => ({
                  productId: line.productId,
                  productName: line.productName,
                  productSku: line.productSku,
                  unitPrice: line.unitPrice,
                  quantity: line.quantity,
                  lineTotal: line.lineTotal,
                })),
              },
              statusHistory: {
                create: {
                  fromStatus: null,
                  toStatus: OrderStatus.PENDING,
                  note: 'Order created',
                  changedById: userId,
                },
              },
            },
            include: orderInclude,
          });
          break;
        } catch (error) {
          if ((error as { code?: string }).code === 'P2002' && attempts < 5) {
            continue;
          }
          throw error;
        }
      }

      if (!created) {
        throw new ValidationError('Unable to create order');
      }

      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 15000,
    },
  );

  return serializeOrder(order);
}

/**
 * Create order — validate coupon before locking to fail fast, then full txn.
 */
export async function checkout(userId: string, input: CreateOrderInput) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  const provisionalSubtotal = roundMoney(
    cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
  );

  await validateCoupon(input.couponCode, userId, provisionalSubtotal);

  return createOrderFromCart(userId, input);
}

export async function listUserOrders(userId: string, query: ListOrdersQuery) {
  const where: Prisma.OrderWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
    }),
  ]);

  return paginated(
    orders.map(serializeOrder),
    query.page,
    query.limit,
    total,
  );
}

export async function getUserOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  return serializeOrder(order);
}

export async function listAdminOrders(query: ListAdminOrdersQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.orderNumber ? { orderNumber: { contains: query.orderNumber, mode: 'insensitive' } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { orderNumber: { contains: query.search, mode: 'insensitive' } },
            { user: { email: { contains: query.search, mode: 'insensitive' } } },
            { user: { name: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
    }),
  ]);

  return paginated(
    orders.map(serializeOrder),
    query.page,
    query.limit,
    total,
  );
}

export async function updateOrderStatus(
  orderId: string,
  adminUserId: string,
  input: UpdateOrderStatusInput,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status === input.status) {
    throw new ValidationError(`Order is already ${input.status}`);
  }

  assertTransition(order.status, input.status);

  const updated = await prisma.$transaction(async (tx) => {
    // Restore stock on cancellation
    if (input.status === OrderStatus.CANCELLED) {
      const lockedIds = [...order.items]
        .map((i) => i.productId)
        .sort((a, b) => a.localeCompare(b));

      for (const productId of lockedIds) {
        await tx.$queryRaw`
          SELECT id FROM products WHERE id = ${productId} FOR UPDATE
        `;
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    const data: Prisma.OrderUpdateInput = {
      status: input.status,
      ...(input.status === OrderStatus.PAID ? { paidAt: new Date() } : {}),
      ...(input.status === OrderStatus.SHIPPED ? { shippedAt: new Date() } : {}),
      ...(input.status === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
      ...(input.status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
      statusHistory: {
        create: {
          fromStatus: order.status,
          toStatus: input.status,
          note: input.note,
          changedById: adminUserId,
        },
      },
    };

    return tx.order.update({
      where: { id: orderId },
      data,
      include: orderInclude,
    });
  });

  return serializeOrder(updated);
}

export async function assertOrderOwner(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) throw new NotFoundError('Order not found');
  if (order.userId !== userId) throw new ForbiddenError('Not your order');
}
