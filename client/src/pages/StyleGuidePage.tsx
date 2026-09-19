import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  Input,
  Modal,
  Skeleton,
  ThemeToggle,
} from '@/components/ui';
import { toast } from '@/store/useToastStore';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-content">{title}</h2>
        <p className="mt-1 text-sm text-content-muted">{description}</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-soft">{children}</div>
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-14 rounded-xl border border-border shadow-soft ${className}`} />
      <span className="text-2xs font-medium text-content-muted">{name}</span>
    </div>
  );
}

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-raised/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-primary-600">
              Design system
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-content">Style guide</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
        <Section title="Color palette" description="Primary, secondary neutrals, and semantic status colors.">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Primary
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Swatch name="primary-50" className="bg-primary-50" />
                <Swatch name="primary-200" className="bg-primary-200" />
                <Swatch name="primary-500" className="bg-primary-500" />
                <Swatch name="primary-600" className="bg-primary-600" />
                <Swatch name="primary-800" className="bg-primary-800" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Secondary / neutral
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Swatch name="secondary-100" className="bg-secondary-100" />
                <Swatch name="secondary-300" className="bg-secondary-300" />
                <Swatch name="secondary-500" className="bg-secondary-500" />
                <Swatch name="secondary-700" className="bg-secondary-700" />
                <Swatch name="secondary-900" className="bg-secondary-900" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Semantic
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Swatch name="success-500" className="bg-success-500" />
                <Swatch name="warning-500" className="bg-warning-500" />
                <Swatch name="danger-500" className="bg-danger-500" />
                <Swatch name="surface-muted" className="bg-surface-muted" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Typography" description="Inter — clean SaaS sans with tight tracking on headings.">
          <div className="space-y-3">
            <p className="text-4xl font-semibold tracking-tight text-content">Display heading</p>
            <p className="text-2xl font-semibold tracking-tight text-content">Section heading</p>
            <p className="text-base text-content">
              Body copy for product pages and dashboards. Smooth, readable, and neutral.
            </p>
            <p className="text-sm text-content-muted">Muted supporting text for hints and metadata.</p>
            <p className="text-xs text-content-subtle">Subtle captions and labels</p>
          </div>
        </Section>

        <Section title="Buttons" description="Primary, secondary, outline, ghost, and danger variants.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button isLoading>Loading</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Inputs" description="Labeled fields with hint and error states.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Email" placeholder="you@company.com" hint="We’ll never share your email." />
            <Input label="Password" type="password" defaultValue="short" error="Must be at least 8 characters." />
          </div>
        </Section>

        <Section title="Badges" description="Status chips for orders, inventory, and roles.">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Failed</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Section>

        <Section title="Cards" description="Raised surfaces with soft shadows and rounded-2xl corners.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-content">$24,890</p>
                <p className="mt-1 text-sm text-success-600">+12.4% vs prior period</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  View report
                </Button>
              </CardFooter>
            </Card>
            <Card className="hover:shadow-elevated">
              <CardHeader>
                <CardTitle>Inventory alert</CardTitle>
                <CardDescription>SKU-1042 is running low</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-content-muted">
                  Soft hover elevation and consistent padding keep dashboards calm and scannable.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Dropdown" description="Menu with keyboard escape and outside-click dismiss.">
          <Dropdown
            label="Actions"
            items={[
              { id: 'edit', label: 'Edit product', onSelect: () => toast.show({ title: 'Edit clicked' }) },
              {
                id: 'duplicate',
                label: 'Duplicate',
                onSelect: () => toast.success('Duplicated', 'A draft copy was created.'),
              },
              {
                id: 'delete',
                label: 'Delete',
                danger: true,
                onSelect: () => toast.error('Delete blocked', 'Connect auth before destructive actions.'),
              },
            ]}
          />
        </Section>

        <Section title="Modal" description="Focus-friendly dialog with backdrop blur.">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirm archive"
            description="This product will be hidden from the storefront."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setModalOpen(false);
                    toast.success('Archived', 'Product is no longer visible.');
                  }}
                >
                  Archive
                </Button>
              </>
            }
          >
            <p className="text-sm text-content-muted">
              Customers will no longer see this item in search or category listings. You can restore it
              later from admin.
            </p>
          </Modal>
        </Section>

        <Section title="Skeleton loaders" description="Shimmer placeholders for async content.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" rounded="2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-10" rounded="full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" rounded="xl" />
            </div>
          </div>
        </Section>

        <Section title="Toasts" description="Transient feedback for success, warning, and error states.">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => toast.show({ title: 'Saved draft' })}>
              Default toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success('Payment captured', 'Order #1842 is now paid.')}
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.warning('Low stock', 'Only 3 units left for SKU-220.')}
            >
              Warning
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error('Checkout failed', 'Stripe declined the card.')}
            >
              Error
            </Button>
          </div>
        </Section>

        <Section title="Dark mode" description="Class-based theme with persisted preference.">
          <div className="flex flex-wrap items-center gap-4">
            <ThemeToggle />
            <p className="text-sm text-content-muted">
              Toggle applies the <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">dark</code>{' '}
              class on <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">&lt;html&gt;</code> and
              stores the choice in localStorage.
            </p>
          </div>
        </Section>
      </main>
    </div>
  );
}
