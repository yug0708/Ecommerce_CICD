import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (v.length >= 7 && v.length <= 20), {
      message: 'Enter a valid phone number',
    }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AccountProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        phone: user.phone ?? '',
      });
    }
  }, [user, form]);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    try {
      await updateProfile({
        name: values.name,
        phone: values.phone || null,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Update failed', getErrorMessage(error, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">Profile</h1>
        <p className="mt-1 text-sm text-content-muted">
          Update your display name and phone number. Email is managed by your account credentials.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-soft"
      >
        <Input
          label="Full name"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input label="Email" value={user?.email ?? ''} disabled hint="Email cannot be changed here" />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <span className="rounded-md bg-surface-muted px-2 py-1 font-medium uppercase tracking-wide">
            {user?.role ?? 'CUSTOMER'}
          </span>
          {user?.createdAt ? (
            <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
          ) : null}
        </div>
        <Button type="submit" isLoading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
