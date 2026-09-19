import {
  CategoryShowcaseSection,
  FeaturedProductsSection,
  HeroSection,
  NewsletterSection,
  TestimonialsSection,
} from '@/components/landing';
import { Seo } from '@/components/seo/Seo';

export default function HomePage() {
  return (
    <main>
      <Seo
        title="Objects worth keeping"
        description="A calm storefront for thoughtfully made essentials — shop apparel, home, and daily carry."
        path="/"
      />
      <HeroSection />
      <FeaturedProductsSection />
      <CategoryShowcaseSection />
      <TestimonialsSection />
      <NewsletterSection />
    </main>
  );
}
