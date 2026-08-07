import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function NewArrivalsPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'Just landed',
        title: 'New Arrivals',
        description: 'Fresh from the atelier — the latest releases, presented in the order they arrived.',
        metaDescription: 'The latest BRISTI releases, fresh from the atelier.',
        filter: { newArrival: true },
      }}
    />
  );
}
