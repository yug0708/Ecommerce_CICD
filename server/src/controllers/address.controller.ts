import type { Request, Response } from 'express';
import * as addressService from '../services/address.service.js';
import { success } from '../utils/apiResponse.js';

function idParam(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0]! : value;
}

export async function listAddresses(req: Request, res: Response): Promise<void> {
  const addresses = await addressService.listAddresses(req.user!.id);
  res.status(200).json(success({ addresses }, 'Addresses retrieved'));
}

export async function createAddress(req: Request, res: Response): Promise<void> {
  const address = await addressService.createAddress(req.user!.id, req.body);
  res.status(201).json(success({ address }, 'Address created'));
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  const address = await addressService.updateAddress(req.user!.id, idParam(req), req.body);
  res.status(200).json(success({ address }, 'Address updated'));
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const address = await addressService.deleteAddress(req.user!.id, idParam(req));
  res.status(200).json(success({ address }, 'Address deleted'));
}
