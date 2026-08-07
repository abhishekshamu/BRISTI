import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function FeaturedPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'Curated by the maison',
        title: 'Featured',
        description: 'The pieces we are most proud of this season.',
        metaDescription: 'The BRISTI pieces we are most proud of this season.',
        filter: { featured: true },
      }}
    />
  );
}
