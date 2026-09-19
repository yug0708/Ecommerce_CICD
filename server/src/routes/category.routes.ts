import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createCategorySchema,
  idParamSchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '../validators/category.validators.js';

const categoryRouter = Router();

categoryRouter.get(
  '/',
  validate({ query: listCategoriesQuerySchema }),
  asyncHandler(listCategories),
);

categoryRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getCategory));

categoryRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: createCategorySchema }),
  asyncHandler(createCategory),
);

categoryRouter.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(updateCategory),
);

categoryRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(deleteCategory),
);

export { categoryRouter };
