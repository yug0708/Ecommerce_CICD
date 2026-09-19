import type { BadgeProps } from '@/components/ui/Badge';

const STATUS_META: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'primary' },
  SHIPPED: { label: 'Shipped', variant: 'primary' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

export function orderStatusMeta(status: string) {
  return (
    STATUS_META[status.toUpperCase()] ?? {
      label: status,
      variant: 'outline' as const,
    }
  );
}
