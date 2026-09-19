import { Router } from 'express';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../controllers/address.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from '../validators/address.validators.js';

const addressRouter = Router();

addressRouter.use(authenticate);

addressRouter.get('/', asyncHandler(listAddresses));
addressRouter.post('/', validate({ body: createAddressSchema }), asyncHandler(createAddress));
addressRouter.put(
  '/:id',
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  asyncHandler(updateAddress),
);
addressRouter.delete(
  '/:id',
  validate({ params: addressIdParamSchema }),
  asyncHandler(deleteAddress),
);

export { addressRouter };
