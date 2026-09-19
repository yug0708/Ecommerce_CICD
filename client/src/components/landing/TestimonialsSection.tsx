import { motion } from 'framer-motion';
import { FadeIn, Stagger, staggerItem } from './motion';

const testimonials = [
  {
    quote:
      'Checkout finally feels as polished as our product pages. Returns dropped and support tickets got quieter.',
    name: 'Ava Chen',
    role: 'Founder, Northline Studio',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  },
  {
    quote:
      'We launched a new collection in an afternoon. Inventory sync and admin tools just stay out of the way.',
    name: 'Marcus Reid',
    role: 'Ops Lead, Field & Form',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
  },
  {
    quote:
      'Customers notice the speed. Pages are calm, payments are reliable, and the brand still feels like us.',
    name: 'Sofia Alvarez',
    role: 'Creative Director, Atelier Sol',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80',
  },
];

export function TestimonialsSection() {
  return (
    <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">
            Social proof
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
            Loved by modern brands
          </h2>
          <p className="mt-2 text-sm text-content-muted">
            Teams use Ecommerce to ship storefronts that feel premium without the ops drag.
          </p>
        </FadeIn>

        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <motion.blockquote
              key={item.name}
              variants={staggerItem}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-soft"
            >
              <p className="flex-1 text-sm leading-relaxed text-content-muted">“{item.quote}”</p>
              <footer className="mt-6 flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={`Portrait of ${item.name}`}
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <cite className="not-italic text-sm font-semibold text-content">{item.name}</cite>
                  <p className="text-xs text-content-subtle">{item.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
