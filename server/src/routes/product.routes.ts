import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listProducts,
  updateProduct,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { productImageUpload, validateUploadedImages } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema, slugParamSchema } from '../validators/category.validators.js';
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from '../validators/product.validators.js';

const productRouter = Router();

productRouter.get(
  '/',
  validate({ query: listProductsQuerySchema }),
  asyncHandler(listProducts),
);

productRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(getProductBySlug),
);

productRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  productImageUpload.array('images', 8),
  validateUploadedImages,
  validate({ body: createProductSchema }),
  asyncHandler(createProduct),
);

productRouter.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  productImageUpload.array('images', 8),
  validateUploadedImages,
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(updateProduct),
);

productRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParamSchema }),
  asyncHandler(deleteProduct),
);

export { productRouter };
