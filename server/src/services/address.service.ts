import { prisma } from '../prisma/client.js';
import { NotFoundError } from '../utils/AppError.js';
import type { CreateAddressInput, UpdateAddressInput } from '../validators/address.validators.js';

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, type: input.type },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        type: input.type,
        label: input.label,
        fullName: input.fullName,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        phone: input.phone ?? null,
        isDefault: input.isDefault ?? false,
      },
    });
  });
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Address not found');
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, type: input.type ?? existing.type, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
        ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Address not found');
  }

  await prisma.address.delete({ where: { id } });
  return existing;
}
