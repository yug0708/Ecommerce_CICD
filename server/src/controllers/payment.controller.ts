import type { Request, Response } from 'express';
import * as paymentService from '../services/payment.service.js';
import { success } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

function idParam(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0]! : value;
}

export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const result = await paymentService.createPaymentIntent(req.user!.id, req.body.orderId);
  res.status(201).json(success(result, 'Payment intent created'));
}

export async function confirmDemoPayment(req: Request, res: Response): Promise<void> {
  const result = await paymentService.confirmDemoPayment(
    req.user!.id,
    req.body.orderId,
    req.body.clientSecret,
  );
  res.status(200).json(success(result, 'Demo payment confirmed'));
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  const payment = await paymentService.getPaymentForUser(req.user!.id, idParam(req));
  res.status(200).json(success({ payment }, 'Payment retrieved'));
}

export async function refundPayment(req: Request, res: Response): Promise<void> {
  const payment = await paymentService.refundPayment(
    req.user!.id,
    idParam(req),
    req.body.amount,
  );
  res.status(200).json(success({ payment }, 'Refund processed'));
}

/**
 * Stripe webhook — expects raw Buffer body (mounted with express.raw).
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    logger.error('Stripe webhook received non-raw body — check middleware order');
    res.status(400).json({ success: false, message: 'Expected raw body' });
    return;
  }

  const event = await paymentService.constructStripeEvent(rawBody, signature);

  try {
    await paymentService.handleStripeWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error, type: event.type }, 'Stripe webhook handler failed');
    // Return 500 so Stripe retries
    res.status(500).json({ received: false });
  }
}
