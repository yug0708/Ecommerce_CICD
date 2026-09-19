import { Router } from 'express';
import {
  createOrder,
  getMyOrder,
  listAdminOrders,
  listMyOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createOrderSchema,
  listAdminOrdersQuerySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from '../validators/order.validators.js';

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post('/', validate({ body: createOrderSchema }), asyncHandler(createOrder));
orderRouter.get('/', validate({ query: listOrdersQuerySchema }), asyncHandler(listMyOrders));
orderRouter.get('/:id', validate({ params: orderIdParamSchema }), asyncHandler(getMyOrder));

const adminOrderRouter = Router();

adminOrderRouter.use(authenticate, authorize('ADMIN'));

adminOrderRouter.get(
  '/',
  validate({ query: listAdminOrdersQuerySchema }),
  asyncHandler(listAdminOrders),
);

adminOrderRouter.patch(
  '/:id/status',
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(updateOrderStatus),
);

export { adminOrderRouter, orderRouter };
