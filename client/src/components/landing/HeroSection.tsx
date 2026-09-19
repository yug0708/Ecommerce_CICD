import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Button } from '@/components/ui';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=75';

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <OptimizedImage
        src={HERO_IMAGE}
        alt="Sunlit retail interior with curated apparel on display racks"
        width={1600}
        height={1067}
        priority
        sizes="100vw"
        srcWidths={[800, 1280, 1920]}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-secondary-950/80 via-secondary-950/55 to-secondary-950/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-secondary-950/50 via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24">
        <motion.p
          className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Ecommerce
        </motion.p>
        <motion.h1
          className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          Objects worth keeping
        </motion.h1>
        <motion.p
          className="mt-4 max-w-lg text-base text-white/75 sm:text-lg"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          A calm storefront for thoughtfully made essentials — ship faster, stock less noise.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/products">
            <Button size="lg" className="bg-white text-secondary-900 hover:bg-secondary-100">
              Shop the collection
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              Create account
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
