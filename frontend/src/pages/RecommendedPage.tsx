import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function RecommendedPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'For you',
        title: 'Recommended',
        description: 'Hand-picked for you by our stylists.',
        metaDescription: 'Hand-picked BRISTI pieces selected by our stylists.',
        filter: { recommended: true },
      }}
    />
  );
}
