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
import { usePageMeta } from '@/lib/seo';

// Canonical rendering order when a section has no admin configuration
const STATIC_ORDER = [
  'hero',
  'luxuryCategories',
  'featuredCollections',
  'newArrivals',
  'bestSellers',
  'trending',
  'customerReviews',
  'journal',
] as const;

// Content sections are rendered only when explicitly configured in the CMS.
// Every other section pulls live data from the API and shows an empty state.
// `campaign-banner` is the slug the admin persists; `campaignBanner` is kept
// for backward compatibility.
const CONFIGURED_ONLY: readonly string[] = ['campaign-banner', 'campaignBanner', 'instagram', 'editorial', 'newsletter'];

type SectionKey = (typeof STATIC_ORDER)[number] | (typeof CONFIGURED_ONLY)[number];

function Section({ type, props }: { type: SectionKey; props?: Record<string, any> }) {
  switch (type) {
    case 'hero': return <HeroEngine />;
    case 'luxuryCategories': return <LuxuryCategories />;
    case 'featuredCollections': return <FeaturedCollections />;
    case 'newArrivals': return <NewArrivals />;
    case 'bestSellers': return <BestSellers />;
    case 'trending': return <TrendingProducts />;
    case 'campaignBanner':
    case 'campaign-banner':
      return <CampaignBanner />;
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
  usePageMeta({
    title: settings?.seo?.defaultTitle ?? settings?.brandName,
    description: settings?.seo?.defaultDescription,
    image: settings?.seo?.defaultImage,
  });

  // Never mount homepage sections before the latest homepage configuration has
  // arrived. Show a premium skeleton until the CMS data is ready, so stale
  // section order/content never flashes on refresh.
  if (loading) return <HomeSkeleton />;

  const configured = (settings?.homepageSections ?? [])
    .filter((section) => section.isActive !== false)
    .map((section) => section.type as SectionKey)
    .filter((type) => [...STATIC_ORDER, ...CONFIGURED_ONLY].includes(type as string));

  const order: SectionKey[] = [
    ...configured,
    ...STATIC_ORDER.filter((type) => !configured.includes(type as string)),
  ];

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
