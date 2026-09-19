import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import { deleteAddress, updateAddress } from '@/lib/account';
import { getErrorMessage } from '@/lib/api';
import {
  createAddress,
  listAddresses,
  type Address,
} from '@/lib/checkout';
import { toast } from '@/store/useToastStore';

const addressSchema = z.object({
  label: z.string().trim().max(50).optional().or(z.literal('')),
  type: z.enum(['SHIPPING', 'BILLING']),
  fullName: z.string().trim().min(2, 'Full name is required'),
  line1: z.string().trim().min(3, 'Address is required'),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postalCode: z.string().trim().min(3, 'Postal code is required'),
  country: z.string().trim().length(2, 'Use a 2-letter country code'),
  phone: z.string().trim().optional().or(z.literal('')),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const emptyValues: AddressFormValues = {
  label: '',
  type: 'SHIPPING',
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
  isDefault: false,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyValues,
  });

  async function refresh() {
    const list = await listAddresses();
    setAddresses(list);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await listAddresses();
        if (!cancelled) setAddresses(list);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load addresses'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setModalOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    form.reset({
      label: address.label ?? '',
      type: address.type,
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    setModalOpen(true);
  }

  async function onSubmit(values: AddressFormValues) {
    setSaving(true);
    try {
      const payload = {
        type: values.type,
        label: values.label || null,
        fullName: values.fullName,
        line1: values.line1,
        line2: values.line2 || null,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        country: values.country.toUpperCase(),
        phone: values.phone || null,
        isDefault: values.isDefault,
      };
      if (editing) {
        await updateAddress(editing.id, payload);
        toast.success('Address updated');
      } else {
        await createAddress(payload);
        toast.success('Address saved');
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      toast.error('Save failed', getErrorMessage(err, 'Could not save address'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(address: Address) {
    if (!window.confirm(`Remove address for ${address.fullName}?`)) return;
    setDeletingId(address.id);
    try {
      await deleteAddress(address.id);
      toast.success('Address removed');
      await refresh();
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err, 'Could not delete address'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Addresses</h1>
          <p className="mt-1 text-sm text-content-muted">
            Save shipping and billing addresses for faster checkout.
          </p>
        </div>
        <Button onClick={openCreate}>Add address</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" rounded="2xl" />
          <Skeleton className="h-40 w-full" rounded="2xl" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
          {error}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-content-muted">No saved addresses yet.</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>
            Add your first address
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col rounded-2xl border border-border bg-surface-raised p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={address.type === 'SHIPPING' ? 'primary' : 'outline'}>
                  {address.type}
                </Badge>
                {address.isDefault ? <Badge variant="success">Default</Badge> : null}
                {address.label ? (
                  <span className="text-xs text-content-muted">{address.label}</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium text-content">{address.fullName}</p>
              <p className="mt-1 flex-1 text-sm text-content-muted">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(address)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deletingId === address.id}
                  onClick={() => void handleDelete(address)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit address' : 'Add address'}
        description="Used for checkout shipping and billing."
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={form.handleSubmit(onSubmit)}>
              {editing ? 'Save changes' : 'Add address'}
            </Button>
          </>
        }
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="sm:col-span-2">
            <Input label="Label (optional)" placeholder="Home, Office…" {...form.register('label')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-content">Type</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-content"
              {...form.register('type')}
            >
              <option value="SHIPPING">Shipping</option>
              <option value="BILLING">Billing</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Full name"
              error={form.formState.errors.fullName?.message}
              {...form.register('fullName')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 1"
              error={form.formState.errors.line1?.message}
              {...form.register('line1')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input label="Address line 2" {...form.register('line2')} />
          </div>
          <Input label="City" error={form.formState.errors.city?.message} {...form.register('city')} />
          <Input
            label="State"
            error={form.formState.errors.state?.message}
            {...form.register('state')}
          />
          <Input
            label="Postal code"
            error={form.formState.errors.postalCode?.message}
            {...form.register('postalCode')}
          />
          <Input
            label="Country"
            error={form.formState.errors.country?.message}
            {...form.register('country')}
          />
          <div className="sm:col-span-2">
            <Input label="Phone" {...form.register('phone')} />
          </div>
          <label className="flex items-center gap-2 text-sm text-content sm:col-span-2">
            <input type="checkbox" className="rounded border-border" {...form.register('isDefault')} />
            Set as default address
          </label>
        </form>
      </Modal>
    </div>
  );
}
