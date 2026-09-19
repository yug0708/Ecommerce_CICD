import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Home',
    slug: 'home',
    description: 'Lighting, textiles, and living essentials',
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
    sortOrder: 1,
  },
  {
    name: 'Apparel',
    slug: 'apparel',
    description: 'Layered basics in quiet neutrals',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    sortOrder: 2,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Bags, wallets, and daily carry',
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    sortOrder: 3,
  },
  {
    name: 'Kitchen',
    slug: 'kitchen',
    description: 'Tools for slow mornings',
    imageUrl:
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
    sortOrder: 4,
  },
];

const products = [
  {
    name: 'Minimal Desk Lamp',
    slug: 'minimal-desk-lamp',
    description: 'Warm LED task light with matte aluminum finish.',
    price: 89,
    compareAtPrice: 110,
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 12,
    sku: 'LAMP-01',
    categorySlug: 'home',
  },
  {
    name: 'Everyday Tote',
    slug: 'everyday-tote',
    description: 'Structured canvas tote for work and weekend.',
    price: 64,
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 30,
    sku: 'TOTE-02',
    categorySlug: 'accessories',
  },
  {
    name: 'Ceramic Pour-Over Set',
    slug: 'ceramic-pour-over',
    description: 'Hand-glazed dripper and mug for morning rituals.',
    price: 48,
    compareAtPrice: 58,
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 18,
    sku: 'COFFEE-03',
    categorySlug: 'kitchen',
  },
  {
    name: 'Linen Throw Pillow',
    slug: 'linen-throw-pillow',
    description: 'Soft stonewashed linen with hidden zipper.',
    price: 36,
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 40,
    sku: 'PILLOW-04',
    categorySlug: 'home',
  },
  {
    name: 'Walnut Side Table',
    slug: 'walnut-side-table',
    description: 'Compact solid wood table with eased edges.',
    price: 220,
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1532372320572-cda256256de2?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 6,
    sku: 'TABLE-05',
    categorySlug: 'home',
  },
  {
    name: 'Merino Crew Sweater',
    slug: 'merino-crew-sweater',
    description: 'Fine-gauge merino for year-round layering.',
    price: 128,
    compareAtPrice: 148,
    images: [
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
    ],
    stockQuantity: 22,
    sku: 'SWEATER-06',
    categorySlug: 'apparel',
  },
];

async function main() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const product of products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${product.categorySlug}`);
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        images: product.images,
        stockQuantity: product.stockQuantity,
        sku: product.sku,
        categoryId,
        isActive: true,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        images: product.images,
        stockQuantity: product.stockQuantity,
        sku: product.sku,
        categoryId,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${categories.length} categories and ${products.length} products`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
