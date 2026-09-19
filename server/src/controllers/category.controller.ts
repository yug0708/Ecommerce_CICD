import type { Request, Response } from 'express';
import * as categoryService from '../services/category.service.js';
import {
  CACHE_TTL,
  cacheGet,
  cacheSet,
  catalogCacheKey,
  invalidateCatalogCache,
} from '../lib/cache.js';
import { success } from '../utils/apiResponse.js';

function param(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0]! : value;
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  const cacheKey = catalogCacheKey('categories', req.query);
  const cached = await cacheGet<{ categories: unknown }>(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.setHeader('X-Cache', 'HIT');
    res.status(200).json(success(cached, 'Categories retrieved'));
    return;
  }

  const categories = await categoryService.listCategories(req.query as never);
  const payload = { categories };
  await cacheSet(cacheKey, payload, CACHE_TTL.categories);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(success(payload, 'Categories retrieved'));
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const category = await categoryService.getCategoryById(param(req, 'id'));
  res.status(200).json(success({ category }, 'Category retrieved'));
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const category = await categoryService.createCategory(req.body);
  await invalidateCatalogCache();
  res.status(201).json(success({ category }, 'Category created'));
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const category = await categoryService.updateCategory(param(req, 'id'), req.body);
  await invalidateCatalogCache();
  res.status(200).json(success({ category }, 'Category updated'));
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const category = await categoryService.softDeleteCategory(param(req, 'id'));
  await invalidateCatalogCache();
  res.status(200).json(success({ category }, 'Category deleted'));
}
