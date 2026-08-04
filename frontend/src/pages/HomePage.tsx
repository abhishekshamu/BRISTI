import { useQuery } from '@tanstack/react-query';
import { useSiteSettings } from '@/context/SettingsContext';
import { HeroEngine } from '@/components/hero/HeroEngine';
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
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { productService } from '@/services/product.service';
import { usePageMeta } from '@/lib/seo';

// Canonical rendering order when a section has no admin configuration
const STATIC_ORDER = [
  'hero',
  'luxuryCategories',
  'featuredCollections',
  'newArrivals',
  'bestSellers',
  'trending',
  'campaignBanner',
  'customerReviews',
  'instagram',
  'editorial',
  'journal',
  'newsletter',
] as const;

type SectionKey = (typeof STATIC_ORDER)[number];

function Section({ type, props }: { type: SectionKey; props?: Record<string, any> }) {
  switch (type) {
    case 'hero': return <HeroEngine />;
    case 'luxuryCategories': return <LuxuryCategories />;
    case 'featuredCollections': return <FeaturedCollections />;
    case 'newArrivals': return <NewArrivals />;
    case 'bestSellers': return <BestSellers />;
    case 'trending': return <TrendingProducts />;
    case 'campaignBanner': return <CampaignBanner />;
    case 'customerReviews': return <CustomerReviews />;
    case 'instagram': return <InstagramGallery props={props} />;
    case 'editorial': return <EditorialBanner props={props} />;
    case 'journal': return <JournalPreview />;
    case 'newsletter': return <NewsletterCTA props={props} />;
    default: return null;
  }
}

export default function HomePage() {
  const { settings, loading } = useSiteSettings();
  usePageMeta();

  useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productService.featured(8),
    staleTime: 1000 * 60 * 5,
  });

  // Never mount homepage sections before the latest homepage configuration has
  // arrived. Show a premium skeleton until the CMS data is ready, so stale
  // section order/content never flashes on refresh.
  if (loading) return <HomeSkeleton />;

  const configured = (settings?.homepageSections ?? [])
    .filter((section) => section.isActive !== false)
    .map((section) => section.type as SectionKey)
    .filter((type) => (STATIC_ORDER as readonly string[]).includes(type));

  const order: SectionKey[] = [...configured, ...STATIC_ORDER.filter((type) => !configured.includes(type))];

  const sectionProps = (type: SectionKey) => {
    const section = (settings?.homepageSections ?? []).find((s) => s.type === type && s.isActive !== false);
    return section?.props;
  };

  return (
    <>
      {order.map((type) => (
        <Section key={type} type={type} props={sectionProps(type)} />
      ))}
    </>
  );
}
