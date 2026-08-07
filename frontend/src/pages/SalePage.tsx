import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function SalePage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'Marked down',
        title: 'Sale',
        description: 'Reduced pieces from previous seasons — while they last.',
        metaDescription: 'Reduced BRISTI pieces from previous seasons, while they last.',
        filter: { sale: true },
      }}
    />
  );
}
