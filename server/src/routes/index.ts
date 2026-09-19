import { Router } from 'express';
import { addressRouter } from './address.routes.js';
import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { cartRouter } from './cart.routes.js';
import { categoryRouter } from './category.routes.js';
import { healthRouter } from './health.routes.js';
import { adminOrderRouter, orderRouter } from './order.routes.js';
import { adminPaymentRouter, paymentRouter } from './payment.routes.js';
import { productRouter } from './product.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/admin/orders', adminOrderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin/payments', adminPaymentRouter);
apiRouter.use('/admin', adminRouter);

export { apiRouter };
