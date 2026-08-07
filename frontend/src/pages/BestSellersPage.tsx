import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function BestSellersPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'Most coveted',
        title: 'Best Sellers',
        description: 'The pieces the maison is known for — reordered again and again.',
        metaDescription: 'The most coveted BRISTI pieces, reordered again and again.',
        filter: { bestSeller: true },
      }}
    />
  );
}
