import { Router } from 'express';
import {
  addItem,
  getCart,
  mergeCart,
  removeItem,
  updateItem,
} from '../controllers/cart.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addCartItemSchema,
  mergeCartSchema,
  productIdParamSchema,
  updateCartItemSchema,
} from '../validators/cart.validators.js';

const cartRouter = Router();

cartRouter.use(optionalAuthenticate);

cartRouter.get('/', asyncHandler(getCart));
cartRouter.post('/items', validate({ body: addCartItemSchema }), asyncHandler(addItem));
cartRouter.patch(
  '/items/:productId',
  validate({ params: productIdParamSchema, body: updateCartItemSchema }),
  asyncHandler(updateItem),
);
cartRouter.delete(
  '/items/:productId',
  validate({ params: productIdParamSchema }),
  asyncHandler(removeItem),
);
cartRouter.post(
  '/merge',
  authenticate,
  validate({ body: mergeCartSchema }),
  asyncHandler(mergeCart),
);

export { cartRouter };
