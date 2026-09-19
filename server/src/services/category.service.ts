import type { Category, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { slugify } from '../utils/slug.js';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '../validators/category.validators.js';

async function ensureUniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const slug = slugify(base);
  if (!slug) {
    throw new ValidationError('Unable to generate a valid slug from name');
  }

  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    suffix += 1;
  }
}

export async function listCategories(query: ListCategoriesQuery) {
  const where: Prisma.CategoryWhereInput = {
    isActive: true,
  };

  if (query.parentId !== undefined) {
    where.parentId = query.parentId;
  }

  return prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent || !parent.isActive) {
      throw new ValidationError('parentId must reference an active category');
    }
  }

  const slug = input.slug
    ? await ensureUniqueCategorySlug(input.slug)
    : await ensureUniqueCategorySlug(input.name);

  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('Category slug already exists');
    }
    throw error;
  }
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  if (input.parentId) {
    if (input.parentId === id) {
      throw new ValidationError('Category cannot be its own parent');
    }
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent || !parent.isActive) {
      throw new ValidationError('parentId must reference an active category');
    }
  }

  let slug: string | undefined;
  if (input.slug) {
    slug = await ensureUniqueCategorySlug(input.slug, id);
  } else if (input.name && input.name !== existing.name && !input.slug) {
    slug = await ensureUniqueCategorySlug(input.name, id);
  }

  const data: Prisma.CategoryUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.parentId !== undefined
      ? input.parentId === null
        ? { parent: { disconnect: true } }
        : { parent: { connect: { id: input.parentId } } }
      : {}),
  };

  return prisma.category.update({
    where: { id },
    data,
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

/** Soft delete — sets isActive to false. */
export async function softDeleteCategory(id: string): Promise<Category> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  const activeChildren = await prisma.category.count({
    where: { parentId: id, isActive: true },
  });
  if (activeChildren > 0) {
    throw new ValidationError('Cannot delete category with active subcategories');
  }

  const activeProducts = await prisma.product.count({
    where: { categoryId: id, isActive: true },
  });
  if (activeProducts > 0) {
    throw new ValidationError('Cannot delete category with active products');
  }

  return prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
}
