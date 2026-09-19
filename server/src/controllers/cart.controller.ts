import type { Request, Response } from 'express';
import { getGuestId } from '../middleware/auth.js';
import * as cartService from '../services/cart.service.js';
import { ValidationError } from '../utils/AppError.js';
import { success } from '../utils/apiResponse.js';
import { guestIdSchema } from '../validators/cart.validators.js';

function ownerFromRequest(req: Request): cartService.CartOwner {
  const guestHeader = getGuestId(req);
  if (guestHeader) {
    const parsed = guestIdSchema.safeParse(guestHeader);
    if (!parsed.success) {
      throw new ValidationError('X-Guest-Id must be a valid UUID');
    }
  }
  return cartService.resolveCartOwner(req.user?.id, guestHeader);
}

function productIdParam(req: Request): string {
  const value = req.params.productId;
  return Array.isArray(value) ? value[0]! : value;
}

export async function getCart(req: Request, res: Response): Promise<void> {
  const cart = await cartService.getCart(ownerFromRequest(req));
  res.status(200).json(success({ cart }, 'Cart retrieved'));
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const cart = await cartService.addCartItem(ownerFromRequest(req), req.body);
  res.status(200).json(success({ cart }, 'Item added to cart'));
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const cart = await cartService.updateCartItem(ownerFromRequest(req), productIdParam(req), req.body);
  res.status(200).json(success({ cart }, 'Cart item updated'));
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const cart = await cartService.removeCartItem(ownerFromRequest(req), productIdParam(req));
  res.status(200).json(success({ cart }, 'Cart item removed'));
}

export async function mergeCart(req: Request, res: Response): Promise<void> {
  const cart = await cartService.mergeGuestCart(req.user!.id, req.body.guestId);
  res.status(200).json(success({ cart }, 'Guest cart merged'));
}
