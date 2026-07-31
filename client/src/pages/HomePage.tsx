import { useQuery } from '@tanstack/react-query';
import { HeroSection } from '@/components/home/HeroSection';
import { ValueProps } from '@/components/home/ValueProps';
import { LuxuryCategories } from '@/components/home/LuxuryCategories';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { NewArrivals } from '@/components/home/NewArrivals';
import { BestSellers } from '@/components/home/BestSellers';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { CampaignBanner } from '@/components/home/CampaignBanner';
import { CustomerReviews } from '@/components/home/CustomerReviews';
import { InstagramGallery } from '@/components/home/InstagramGallery';
import { EditorialBanner } from '@/components/home/EditorialBanner';
import { JournalPreview } from '@/components/home/JournalPreview';
import { NewsletterCTA } from '@/components/home/NewsletterCTA';
import { productService } from '@/services/product.service';
import { usePageMeta } from '@/lib/seo';

export default function HomePage() {
  usePageMeta();

  useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productService.featured(8),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <>
      <HeroSection />
      <ValueProps />
      <LuxuryCategories />
      <FeaturedCollections />
      <NewArrivals />
      <BestSellers />
      <TrendingProducts />
      <CampaignBanner />
      <CustomerReviews />
      <InstagramGallery />
      <EditorialBanner />
      <JournalPreview />
      <NewsletterCTA />
    </>
  );
}
