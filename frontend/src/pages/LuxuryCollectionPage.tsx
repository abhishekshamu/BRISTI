import { MarketingListing } from '@/components/marketing/MarketingListing';

export default function LuxuryCollectionPage() {
  return (
    <MarketingListing
      config={{
        eyebrow: 'The pinnacle',
        title: 'Luxury Collection',
        description: 'The finest fabrics and most considered details the atelier makes.',
        metaDescription: 'The finest fabrics and most considered details the BRISTI atelier makes.',
        filter: { premiumCollection: true },
      }}
    />
  );
}
