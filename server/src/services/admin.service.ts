import { OrderStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { paginated } from '../utils/pagination.js';
import { decimalToString } from '../utils/serialize.js';
import type {
  AdminStatsQuery,
  ListAdminProductsQuery,
  ListCustomersQuery,
} from '../validators/admin.validators.js';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const categorySelect = { id: true, name: true, slug: true } as const;

function serializeAdminProduct(
  product: Prisma.ProductGetPayload<{ include: { category: { select: typeof categorySelect } } }>,
) {
  return {
    ...product,
    price: decimalToString(product.price)!,
    compareAtPrice: decimalToString(product.compareAtPrice),
  };
}

export async function getDashboardStats(query: AdminStatsQuery) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (query.days - 1));

  const [
    revenueAgg,
    orderCount,
    customerCount,
    lowStockCount,
    lowStockProducts,
    salesOrders,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES } },
      _sum: { total: true },
    }),
    prisma.order.count(),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.product.count({
      where: { isActive: true, stockQuantity: { lte: query.lowStockThreshold } },
    }),
    prisma.product.findMany({
      where: { isActive: true, stockQuantity: { lte: query.lowStockThreshold } },
      orderBy: { stockQuantity: 'asc' },
      take: 8,
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        images: true,
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: REVENUE_STATUSES },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < query.days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { revenue: 0, orders: 0 });
  }

  for (const order of salesOrders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(order.total);
    bucket.orders += 1;
  }

  const salesOverTime = [...dayMap.entries()].map(([date, value]) => ({
    date,
    revenue: Math.round(value.revenue * 100) / 100,
    orders: value.orders,
  }));

  return {
    totalRevenue: decimalToString(revenueAgg._sum.total) ?? '0.00',
    orderCount,
    customerCount,
    lowStockCount,
    lowStockThreshold: query.lowStockThreshold,
    lowStockProducts,
    salesOverTime,
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: decimalToString(order.total)!,
      createdAt: order.createdAt,
      user: order.user,
    })),
  };
}

export async function listCustomers(query: ListCustomersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : { role: Role.CUSTOMER }),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const spent = users.length
    ? await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: { in: users.map((u) => u.id) },
          status: { in: REVENUE_STATUSES },
        },
        _sum: { total: true },
      })
    : [];

  const spentMap = new Map(
    spent.map((row) => [row.userId, decimalToString(row._sum.total) ?? '0.00']),
  );

  const items = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    orderCount: user._count.orders,
    totalSpent: spentMap.get(user.id) ?? '0.00',
  }));

  return paginated(items, query.page, query.limit, total);
}

export async function listAdminProducts(query: ListAdminProductsQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.lowStock ? { stockQuantity: { lte: 10 } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: { category: { select: categorySelect } },
    }),
  ]);

  return paginated(
    products.map(serializeAdminProduct),
    query.page,
    query.limit,
    total,
  );
}

export async function listAdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  return categories;
}
