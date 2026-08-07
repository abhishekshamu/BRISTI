import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function TrendingPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'In demand',
        title: 'Trending',
        description: 'What the maison’s clients are talking about this season.',
        metaDescription: 'What the BRISTI clients are talking about this season.',
        filter: { trending: true },
      }}
    />
  );
}
