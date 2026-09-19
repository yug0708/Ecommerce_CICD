import { Router } from 'express';
import {
  confirmDemoPayment,
  createPaymentIntent,
  getPayment,
  refundPayment,
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  confirmDemoPaymentSchema,
  createPaymentIntentSchema,
  paymentIdParamSchema,
  refundPaymentSchema,
} from '../validators/payment.validators.js';

const paymentRouter = Router();

paymentRouter.post(
  '/intent',
  authenticate,
  validate({ body: createPaymentIntentSchema }),
  asyncHandler(createPaymentIntent),
);

paymentRouter.post(
  '/demo/confirm',
  authenticate,
  validate({ body: confirmDemoPaymentSchema }),
  asyncHandler(confirmDemoPayment),
);

paymentRouter.get(
  '/:id',
  authenticate,
  validate({ params: paymentIdParamSchema }),
  asyncHandler(getPayment),
);

const adminPaymentRouter = Router();

adminPaymentRouter.use(authenticate, authorize('ADMIN'));

adminPaymentRouter.post(
  '/:id/refund',
  validate({ params: paymentIdParamSchema, body: refundPaymentSchema }),
  asyncHandler(refundPayment),
);

export { adminPaymentRouter, paymentRouter };
