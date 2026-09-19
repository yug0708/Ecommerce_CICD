import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { toast } from '@/store/useToastStore';
import { FadeIn } from './motion';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    toast.success('You’re on the list', 'New drops and early access land in your inbox.');
    setEmail('');
    setLoading(false);
  }

  return (
    <section className="border-b border-border bg-surface-raised py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-900 px-6 py-10 text-white shadow-elevated sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Newsletter
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Get first access to new arrivals
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/75">
                Monthly edits, restocks, and member-only previews — no spam, unsubscribe anytime.
              </p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit}>
              <div className="flex-1">
                <Input
                  aria-label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <Button
                type="submit"
                isLoading={loading}
                className="bg-white text-secondary-900 hover:bg-secondary-100 sm:mb-0.5"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
