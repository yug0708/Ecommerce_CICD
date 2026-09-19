import type { Request, Response } from 'express';
import * as productService from '../services/product.service.js';
import {
  CACHE_TTL,
  cacheGet,
  cacheSet,
  catalogCacheKey,
  invalidateCatalogCache,
} from '../lib/cache.js';
import { toPublicUploadPath } from '../middleware/upload.js';
import { success } from '../utils/apiResponse.js';

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0]! : value;
}

function uploadedPaths(req: Request): string[] {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) return [];
  return files.map((file) => toPublicUploadPath(file.filename));
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const cacheKey = catalogCacheKey('list', req.query);
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.setHeader('X-Cache', 'HIT');
    res.status(200).json(success(cached, 'Products retrieved'));
    return;
  }

  const result = await productService.listProducts(req.query as never);
  await cacheSet(cacheKey, result, CACHE_TTL.productList);
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(success(result, 'Products retrieved'));
}

export async function getProductBySlug(req: Request, res: Response): Promise<void> {
  const slug = param(req, 'slug');
  const cacheKey = catalogCacheKey('slug', slug);
  const cached = await cacheGet<{ product: unknown }>(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.setHeader('X-Cache', 'HIT');
    res.status(200).json(success(cached, 'Product retrieved'));
    return;
  }

  const product = await productService.getProductBySlug(slug);
  const payload = { product };
  await cacheSet(cacheKey, payload, CACHE_TTL.productDetail);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(success(payload, 'Product retrieved'));
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const product = await productService.createProduct(req.body, uploadedPaths(req));
  await invalidateCatalogCache();
  res.status(201).json(success({ product }, 'Product created'));
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const product = await productService.updateProduct(param(req, 'id'), req.body, uploadedPaths(req));
  await invalidateCatalogCache();
  res.status(200).json(success({ product }, 'Product updated'));
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const product = await productService.softDeleteProduct(param(req, 'id'));
  await invalidateCatalogCache();
  res.status(200).json(success({ product }, 'Product deleted'));
}
