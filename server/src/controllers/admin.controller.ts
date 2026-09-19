import type { Request, Response } from 'express';
import * as adminService from '../services/admin.service.js';
import { success } from '../utils/apiResponse.js';

export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await adminService.getDashboardStats(req.query as never);
  res.status(200).json(success(stats, 'Admin dashboard stats'));
}

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const result = await adminService.listCustomers(req.query as never);
  res.status(200).json(success(result, 'Customers retrieved'));
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const result = await adminService.listAdminProducts(req.query as never);
  res.status(200).json(success(result, 'Admin products retrieved'));
}

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await adminService.listAdminCategories();
  res.status(200).json(success({ categories }, 'Admin categories retrieved'));
}
