import type { Decimal } from '@prisma/client/runtime/library';

export function decimalToString(value: Decimal | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toFixed(2);
}
