import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import { decimalToString } from '../utils/serialize.js';
import type { AddCartItemInput, UpdateCartItemInput } from '../validators/cart.validators.js';

const cartItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: true,
      stockQuantity: true,
      isActive: true,
      sku: true,
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartOwner =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestId: string };

function serializeCartItem(item: Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>) {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: {
      ...item.product,
      price: decimalToString(item.product.price)!,
      compareAtPrice: decimalToString(item.product.compareAtPrice),
    },
    lineTotal: (Number(item.product.price) * item.quantity).toFixed(2),
  };
}

function serializeCart(cart: Prisma.CartGetPayload<{ include: { items: { include: typeof cartItemInclude } } }>) {
  const items = cart.items.map(serializeCartItem);
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);

  return {
    id: cart.id,
    userId: cart.userId,
    guestId: cart.guestId,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: subtotal.toFixed(2),
    updatedAt: cart.updatedAt,
  };
}

export function resolveCartOwner(userId?: string, guestId?: string): CartOwner {
  if (userId) {
    return { type: 'user', userId };
  }
  if (guestId) {
    // basic UUID check already done by validators/middleware
    return { type: 'guest', guestId };
  }
  throw new ValidationError('Provide Authorization bearer token or X-Guest-Id header');
}

async function findOrCreateCart(owner: CartOwner) {
  if (owner.type === 'user') {
    const existing = await prisma.cart.findUnique({ where: { userId: owner.userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: owner.userId } });
  }

  const existing = await prisma.cart.findUnique({ where: { guestId: owner.guestId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { guestId: owner.guestId } });
}

async function getCartWithItems(cartId: string) {
  return prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: {
      items: {
        include: cartItemInclude,
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function getCart(owner: CartOwner) {
  const cart = await findOrCreateCart(owner);
  return serializeCart(await getCartWithItems(cart.id));
}

export async function addCartItem(owner: CartOwner, input: AddCartItemInput) {
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { id: input.productId },
        { slug: input.productId },
        { sku: input.productId },
      ],
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.stockQuantity < input.quantity) {
    throw new ValidationError('Insufficient stock for requested quantity', {
      available: product.stockQuantity,
    });
  }

  const cart = await findOrCreateCart(owner);

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId: input.productId },
    },
  });

  const nextQty = (existingItem?.quantity ?? 0) + input.quantity;
  if (nextQty > product.stockQuantity) {
    throw new ValidationError('Insufficient stock for requested quantity', {
      available: product.stockQuantity,
      inCart: existingItem?.quantity ?? 0,
    });
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,
        quantity: input.quantity,
      },
    });
  }

  return serializeCart(await getCartWithItems(cart.id));
}

export async function updateCartItem(
  owner: CartOwner,
  productId: string,
  input: UpdateCartItemInput,
) {
  const cart = await findOrCreateCart(owner);

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    include: { product: true },
  });

  if (!item) {
    throw new NotFoundError('Cart item not found');
  }

  if (!item.product.isActive) {
    throw new ValidationError('Product is no longer available');
  }

  if (item.product.stockQuantity < input.quantity) {
    throw new ValidationError('Insufficient stock for requested quantity', {
      available: item.product.stockQuantity,
    });
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: input.quantity },
  });

  return serializeCart(await getCartWithItems(cart.id));
}

export async function removeCartItem(owner: CartOwner, productId: string) {
  const cart = await findOrCreateCart(owner);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (!existing) {
    throw new NotFoundError('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: existing.id } });
  return serializeCart(await getCartWithItems(cart.id));
}

/**
 * Merges a guest cart into the authenticated user's cart (localStorage sync after login).
 * Quantities for the same product are summed, capped by stock.
 */
export async function mergeGuestCart(userId: string, guestId: string) {
  const guestCart = await prisma.cart.findUnique({
    where: { guestId },
    include: { items: true },
  });

  const userCart = await findOrCreateCart({ type: 'user', userId });

  if (!guestCart || guestCart.items.length === 0) {
    return serializeCart(await getCartWithItems(userCart.id));
  }

  await prisma.$transaction(async (tx) => {
    for (const guestItem of guestCart.items) {
      const product = await tx.product.findFirst({
        where: { id: guestItem.productId, isActive: true },
      });
      if (!product) continue;

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productId: { cartId: userCart.id, productId: guestItem.productId },
        },
      });

      const mergedQty = Math.min(
        product.stockQuantity,
        (existing?.quantity ?? 0) + guestItem.quantity,
      );

      if (mergedQty <= 0) continue;

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: mergedQty },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            quantity: mergedQty,
          },
        });
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  return serializeCart(await getCartWithItems(userCart.id));
}
