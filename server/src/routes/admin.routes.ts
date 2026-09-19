import { Router } from 'express';
import {
  getStats,
  listCategories,
  listCustomers,
  listProducts,
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  adminStatsQuerySchema,
  listAdminProductsQuerySchema,
  listCustomersQuerySchema,
} from '../validators/admin.validators.js';

const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

adminRouter.get('/stats', validate({ query: adminStatsQuerySchema }), asyncHandler(getStats));
adminRouter.get(
  '/customers',
  validate({ query: listCustomersQuerySchema }),
  asyncHandler(listCustomers),
);
adminRouter.get(
  '/products',
  validate({ query: listAdminProductsQuerySchema }),
  asyncHandler(listProducts),
);
adminRouter.get('/categories', asyncHandler(listCategories));

export { adminRouter };
