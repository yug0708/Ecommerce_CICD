import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  updateAdminProduct,
  type AdminCategory,
  type AdminProduct,
} from '@/lib/admin';
import { getErrorMessage } from '@/lib/api';
import { formatPrice, resolveImageUrl } from '@/lib/catalog';
import { toast } from '@/store/useToastStore';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80';

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  sku: string;
  categoryId: string;
  isActive: boolean;
};

const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stockQuantity: '0',
  sku: '',
  categoryId: '',
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === '1');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [files, setFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminProducts({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'true',
        lowStock: lowStock || undefined,
      });
      setProducts(result.items);
      setTotalPages(Math.max(1, result.pagination.totalPages || 1));
    } catch (err) {
      toast.error('Products failed', getErrorMessage(err));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId, activeFilter, lowStock]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchAdminCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: activeCategories[0]?.id ?? '' });
    setExistingImages([]);
    setFiles(null);
    setModalOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? '',
      stockQuantity: String(product.stockQuantity),
      sku: product.sku,
      categoryId: product.categoryId,
      isActive: product.isActive,
    });
    setExistingImages(product.images ?? []);
    setFiles(null);
    setModalOpen(true);
  }

  async function onSave() {
    if (!form.name || !form.description || !form.price || !form.sku || !form.categoryId) {
      toast.warning('Fill required fields');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.slug) fd.append('slug', form.slug);
      fd.append('description', form.description);
      fd.append('price', form.price);
      if (form.compareAtPrice) fd.append('compareAtPrice', form.compareAtPrice);
      fd.append('stockQuantity', form.stockQuantity || '0');
      fd.append('sku', form.sku);
      fd.append('categoryId', form.categoryId);
      fd.append('isActive', String(form.isActive));
      if (editing) {
        fd.append('images', JSON.stringify(existingImages));
      }
      if (files) {
        Array.from(files).forEach((file) => fd.append('images', file));
      }
      if (editing) {
        await updateAdminProduct(editing.id, fd);
        toast.success('Product updated');
      } else {
        await createAdminProduct(fd);
        toast.success('Product created');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error('Save failed', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(product: AdminProduct) {
    if (!window.confirm(`Soft-delete “${product.name}”? It will be hidden from the store.`)) return;
    setDeletingId(product.id);
    try {
      await deleteAdminProduct(product.id);
      toast.success('Product deleted');
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
          <h1 className="text-xl font-semibold tracking-tight text-content">Products</h1>
          <p className="mt-1 text-sm text-content-muted">Search, edit, upload images, and soft-delete.</p>
        </div>
        <Button onClick={openCreate}>Add product</Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-soft">
        <Input
          placeholder="Search name, SKU…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {!c.isActive ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as 'all' | 'true' | 'false');
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setLowStock(e.target.checked);
              setPage(1);
            }}
          />
          Low stock
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-soft">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 font-medium">SKU</th>
                  <th className="px-3 py-2.5 font-medium">Price</th>
                  <th className="px-3 py-2.5 font-medium">Stock</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-content-muted">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-surface-muted/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImageUrl(product.images[0], PLACEHOLDER)}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-content">{product.name}</p>
                            <p className="truncate text-xs text-content-muted">
                              {product.category?.name ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-content-muted">{product.sku}</td>
                      <td className="px-3 py-2.5 font-medium">{formatPrice(product.price)}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            product.stockQuantity === 0
                              ? 'danger'
                              : product.stockQuantity <= 10
                                ? 'warning'
                                : 'outline'
                          }
                        >
                          {product.stockQuantity}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={product.isActive ? 'success' : 'outline'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={deletingId === product.id}
                            disabled={!product.isActive}
                            onClick={() => void onDelete(product)}
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-content-muted">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit product' : 'Add product'}
        description="Images upload as multipart; existing URLs are preserved on edit."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={() => void onSave()}>
              {editing ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          <div className="sm:col-span-2">
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
          </div>
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <Input
            label="Compare-at price"
            type="number"
            step="0.01"
            value={form.compareAtPrice}
            onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
          />
          <Input
            label="Stock"
            type="number"
            value={form.stockQuantity}
            onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Category</label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Select…</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-content">Description</label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active in storefront
          </label>
          {existingImages.length ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-content">Current images</p>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((src) => (
                  <div key={src} className="relative">
                    <img
                      src={resolveImageUrl(src, PLACEHOLDER)}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-xs text-white"
                      onClick={() => setExistingImages((imgs) => imgs.filter((i) => i !== src))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-content">Upload images</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full text-sm text-content-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
