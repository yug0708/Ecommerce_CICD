import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { toast } from '@/store/useToastStore';

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: '0',
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await fetchAdminCategories());
    } catch (err) {
      toast.error('Categories failed', getErrorMessage(err));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(category: AdminCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive,
    });
    setModalOpen(true);
  }

  async function onSave() {
    if (form.name.trim().length < 2) {
      toast.warning('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug || undefined,
        description: form.description || null,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editing) {
        await updateAdminCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await createAdminCategory(payload);
        toast.success('Category created');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error('Save failed', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category: AdminCategory) {
    if (!window.confirm(`Soft-delete “${category.name}”?`)) return;
    setDeletingId(category.id);
    try {
      await deleteAdminCategory(category.id);
      toast.success('Category deleted');
      await load();
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content">Categories</h1>
          <p className="mt-1 text-sm text-content-muted">Organize the catalog hierarchy.</p>
        </div>
        <Button onClick={openCreate}>Add category</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-soft">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Parent</th>
                  <th className="px-3 py-2.5 font-medium">Products</th>
                  <th className="px-3 py-2.5 font-medium">Sort</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-content-muted">
                      No categories yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-surface-muted/40">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-content">{category.name}</p>
                        <p className="text-xs text-content-muted">{category.slug}</p>
                      </td>
                      <td className="px-3 py-2.5 text-content-muted">
                        {category.parent?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">{category._count?.products ?? 0}</td>
                      <td className="px-3 py-2.5 text-content-muted">{category.sortOrder}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={category.isActive ? 'success' : 'outline'}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={deletingId === category.id}
                            disabled={!category.isActive}
                            onClick={() => void onDelete(category)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit category' : 'Add category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={() => void onSave()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                slug: editing ? f.slug : slugify(name),
              }));
            }}
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Parent</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm"
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            >
              <option value="">None</option>
              {categories
                .filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Description</label>
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
