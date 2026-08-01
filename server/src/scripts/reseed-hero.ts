import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HeroBlockModel } from '../models/HeroBlock';
import { getMongoUri, stopMemoryMongo } from '../config/database';
import type { HeroBlock } from 'shared/types';

dotenv.config();

const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const DEMO_SET: Partial<HeroBlock> = {
  name: 'Autumn–Winter 2026 Editorial',
  panels: [
    {
      label: 'Panel 1 — The Collection',
      status: 'published',
      isActive: true,
      slides: [
        {
          eyebrow: 'The Autumn–Winter 2026 Collection',
          heading: 'Silhouettes in whispers of gold',
          ctaText: 'Explore the collection',
          ctaLinkType: 'collection',
          ctaLink: 'autumn-winter-2026',
          image: IMG('photo-1490481651871-ab68de25d43d', 1200),
          imageMobile: IMG('photo-1490481651871-ab68de25d43d', 900),
          status: 'published',
          isActive: true,
          altText: 'Editorial campaign imagery for the Autumn–Winter 2026 collection',
        },
        {
          eyebrow: 'Crafted in Italy',
          heading: 'The atelier behind the fabric',
          ctaText: 'Discover the craft',
          ctaLinkType: 'category',
          ctaLink: 'japanese-trouser',
          image: IMG('photo-1441986300917-64674bd600d8', 1200),
          imageMobile: IMG('photo-1441986300917-64674bd600d8', 900),
          status: 'published',
          isActive: true,
          altText: 'Tailoring detail shot from the atelier',
        },
      ],
    },
    {
      label: 'Panel 2 — New Arrivals',
      status: 'published',
      isActive: true,
      slides: [
        {
          eyebrow: 'New season',
          heading: 'Heavyweight. Quiet. Precious.',
          ctaText: 'Shop new arrivals',
          ctaLinkType: 'custom',
          ctaLink: '/shop?sort=newest',
          image: IMG('photo-1521334884684-d80222895322', 1200),
          imageMobile: IMG('photo-1521334884684-d80222895322', 900),
          status: 'published',
          isActive: true,
          altText: 'New season apparel campaign',
        },
        {
          eyebrow: 'The essentials',
          heading: 'Pieces you will wear forever',
          ctaText: 'Shop the essentials',
          ctaLinkType: 'category',
          ctaLink: 'luxury-hoodies',
          image: IMG('photo-1556821840-3a63f95609a7', 1200),
          imageMobile: IMG('photo-1556821840-3a63f95609a7', 900),
          status: 'published',
          isActive: true,
          altText: 'Luxury essentials campaign',
        },
      ],
    },
    {
      label: 'Panel 3 — Members Only',
      status: 'published',
      isActive: true,
      slides: [
        {
          eyebrow: 'BRISTI Members',
          heading: 'Private previews, first',
          ctaText: 'Join the list',
          ctaLinkType: 'custom',
          ctaLink: '/collections',
          image: IMG('photo-1483985988355-763728e1935b', 1200),
          imageMobile: IMG('photo-1483985988355-763728e1935b', 900),
          status: 'published',
          isActive: true,
          altText: 'Members preview campaign',
        },
      ],
    },
  ],
  overlay: true,
  overlayOpacity: 45,
  gradient: true,
  animationSpeed: 0.7,
  priority: 0,
  status: 'published',
  isActive: true,
};

async function run() {
  const uri = await getMongoUri();
  await mongoose.connect(uri);
  console.log(`Reseeding hero sets into: ${uri}`);

  const deleted = await HeroBlockModel.deleteMany({});
  console.log(`Removed ${deleted.deletedCount} legacy hero block(s)`);

  const created = await HeroBlockModel.create(DEMO_SET);
  console.log(`Created demo hero set: ${created.name} (id ${created._id})`);

  await stopMemoryMongo();
  await mongoose.disconnect();
  console.log('Done. All images are Unsplash placeholders — replace via Media Manager + hero editor.');
}

run().catch((error) => {
  console.error('Reseed failed:', error);
  process.exit(1);
});
