import type { Request, Response } from 'express';
import * as orderService from '../services/order.service.js';
import * as paymentService from '../services/payment.service.js';
import { success } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

function orderIdParam(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0]! : value;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const order = await orderService.checkout(req.user!.id, req.body);

  let payment: Awaited<ReturnType<typeof paymentService.createPaymentIntent>> | null = null;
  try {
    payment = await paymentService.createPaymentIntent(req.user!.id, order.id);
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, 'Payment intent creation failed after checkout');
  }

  res.status(201).json(
    success(
      { order, payment },
      payment
        ? 'Order created; complete payment with clientSecret'
        : 'Order created; call POST /api/payments/intent to retry payment setup',
    ),
  );
}

export async function listMyOrders(req: Request, res: Response): Promise<void> {
  const result = await orderService.listUserOrders(req.user!.id, req.query as never);
  res.status(200).json(success(result, 'Orders retrieved'));
}

export async function getMyOrder(req: Request, res: Response): Promise<void> {
  const order = await orderService.getUserOrder(req.user!.id, orderIdParam(req));
  res.status(200).json(success({ order }, 'Order retrieved'));
}

export async function listAdminOrders(req: Request, res: Response): Promise<void> {
  const result = await orderService.listAdminOrders(req.query as never);
  res.status(200).json(success(result, 'Admin orders retrieved'));
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const order = await orderService.updateOrderStatus(orderIdParam(req), req.user!.id, req.body);
  res.status(200).json(success({ order }, 'Order status updated'));
}
