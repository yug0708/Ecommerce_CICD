import type { Prisma, Product } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { paginated } from '../utils/pagination.js';
import { decimalToString } from '../utils/serialize.js';
import { slugify } from '../utils/slug.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../validators/product.validators.js';

const categorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

function serializeProduct<T extends { price: Product['price']; compareAtPrice: Product['compareAtPrice'] }>(
  product: T,
) {
  return {
    ...product,
    price: decimalToString(product.price)!,
    compareAtPrice: decimalToString(product.compareAtPrice),
  };
}

async function ensureUniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) {
    throw new ValidationError('Unable to generate a valid slug from name');
  }

  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    suffix += 1;
  }
}

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw new ValidationError('categoryId must reference an active category');
  }
}

export async function listProducts(query: ListProductsQuery) {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  } else if (query.categorySlug) {
    where.category = { slug: query.categorySlug, isActive: true };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sortBy === 'popularity'
      ? { reviews: { _count: query.sortOrder } }
      : { [query.sortBy]: query.sortOrder };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: query.limit,
      orderBy,
      // Slim list payload (no full description) — avoids extra bytes and keeps one include, no N+1
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        stockQuantity: true,
        sku: true,
        images: true,
        categoryId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        category: { select: categorySelect },
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  const averages = products.length
    ? await prisma.review.groupBy({
        by: ['productId'],
        where: {
          productId: { in: products.map((p) => p.id) },
          isVisible: true,
        },
        _avg: { rating: true },
      })
    : [];

  const avgMap = new Map(
    averages.map((row) => [row.productId, row._avg.rating ? Number(row._avg.rating.toFixed(2)) : null]),
  );

  let items = products.map((product) => {
    const serialized = serializeProduct(product);
    return {
      ...serialized,
      description:
        serialized.description.length > 280
          ? `${serialized.description.slice(0, 277)}...`
          : serialized.description,
      averageRating: avgMap.get(product.id) ?? null,
      reviewCount: product._count.reviews,
    };
  });

  if (query.minRating !== undefined) {
    items = items.filter(
      (item) => item.averageRating != null && item.averageRating >= query.minRating!,
    );
  }

  return paginated(items, query.page, query.limit, total);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: categorySelect },
      reviews: {
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      NOT: { id: product.id },
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: categorySelect },
    },
  });

  const avg =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : null;

  return {
    ...serializeProduct(product),
    averageRating: avg === null ? null : Number(avg.toFixed(2)),
    relatedProducts: related.map((item) => serializeProduct(item)),
  };
}

export async function createProduct(input: CreateProductInput, uploadedImagePaths: string[] = []) {
  await assertCategoryExists(input.categoryId);

  const slug = input.slug
    ? await ensureUniqueProductSlug(input.slug)
    : await ensureUniqueProductSlug(input.name);

  const images = [...input.images, ...uploadedImagePaths];

  try {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        stockQuantity: input.stockQuantity,
        sku: input.sku.toUpperCase(),
        images,
        categoryId: input.categoryId,
        isActive: input.isActive ?? true,
      },
      include: {
        category: { select: categorySelect },
        _count: { select: { reviews: true } },
      },
    });

    return serializeProduct(product);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('Product slug or SKU already exists');
    }
    throw error;
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  uploadedImagePaths: string[] = [],
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Product not found');
  }

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  let slug: string | undefined;
  if (input.slug) {
    slug = await ensureUniqueProductSlug(input.slug, id);
  } else if (input.name && input.name !== existing.name) {
    slug = await ensureUniqueProductSlug(input.name, id);
  }

  const nextPrice = input.price ?? Number(existing.price);
  const nextCompare =
    input.compareAtPrice !== undefined
      ? input.compareAtPrice
      : existing.compareAtPrice
        ? Number(existing.compareAtPrice)
        : null;

  if (nextCompare != null && nextCompare <= nextPrice) {
    throw new ValidationError('compareAtPrice must be greater than price');
  }

  const images =
    input.images !== undefined || uploadedImagePaths.length > 0
      ? [...(input.images ?? existing.images), ...uploadedImagePaths]
      : undefined;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice } : {}),
        ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
        ...(input.sku !== undefined ? { sku: input.sku.toUpperCase() } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(images !== undefined ? { images } : {}),
      },
      include: {
        category: { select: categorySelect },
        _count: { select: { reviews: true } },
      },
    });

    return serializeProduct(product);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('Product slug or SKU already exists');
    }
    throw error;
  }
}

/** Soft delete — sets isActive to false. */
export async function softDeleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Product not found');
  }

  if (!existing.isActive) {
    throw new NotFoundError('Product already deleted');
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include: {
      category: { select: categorySelect },
    },
  });

  return serializeProduct(product);
}
