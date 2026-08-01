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
          heading: 'The New Season',
          image: IMG('photo-1490481651871-ab68de25d43d', 1200),
          imageMobile: IMG('photo-1490481651871-ab68de25d43d', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'New season campaign — replace with real BRISTI asset',
        },
        {
          heading: 'Quiet Luxury',
          image: IMG('photo-1441986300917-64674bd600d8', 1200),
          imageMobile: IMG('photo-1441986300917-64674bd600d8', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Quiet luxury campaign — replace with real BRISTI asset',
        },
        {
          heading: 'Timeless Craft',
          image: IMG('photo-1521334884684-d80222895322', 1200),
          imageMobile: IMG('photo-1521334884684-d80222895322', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Craft campaign — replace with real BRISTI asset',
        },
      ],
    },
    {
      label: 'Panel 2 — New Arrivals',
      status: 'published',
      isActive: true,
      slides: [
        {
          heading: 'Heavyweight Denim',
          image: IMG('photo-1542272604-787c3835535d', 1200),
          imageMobile: IMG('photo-1542272604-787c3835535d', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Denim campaign — replace with real BRISTI asset',
        },
        {
          heading: 'City Tailoring',
          image: IMG('photo-1556821840-3a63f95609a7', 1200),
          imageMobile: IMG('photo-1556821840-3a63f95609a7', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Tailoring campaign — replace with real BRISTI asset',
        },
        {
          heading: 'Street Icons',
          image: IMG('photo-1483985988355-763728e1935b', 1200),
          imageMobile: IMG('photo-1483985988355-763728e1935b', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Street icons campaign — replace with real BRISTI asset',
        },
      ],
    },
    {
      label: 'Panel 3 — Members Only',
      status: 'published',
      isActive: true,
      slides: [
        {
          heading: 'Members First',
          image: IMG('photo-1515886657613-9f3515b0c78f', 1200),
          imageMobile: IMG('photo-1515886657613-9f3515b0c78f', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Members campaign — replace with real BRISTI asset',
        },
        {
          heading: 'Private Preview',
          image: IMG('photo-1487222477894-8943e31ef7b2', 1200),
          imageMobile: IMG('photo-1487222477894-8943e31ef7b2', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Private preview — replace with real BRISTI asset',
        },
        {
          heading: 'By Invitation',
          image: IMG('photo-1441986300917-64674bd600d8', 1200),
          imageMobile: IMG('photo-1441986300917-64674bd600d8', 900),
          status: 'published',
          isActive: true,
          showEyebrow: false,
          showCta: false,
          altText: 'Invitation campaign — replace with real BRISTI asset',
        },
      ],
    },
  ],
  gradient: false,
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
  console.log(`Created demo hero set: ${created.name} (id ${created._id}) — ${created.panels.length} panels x ${created.panels[0]?.slides?.length} slides`);

  await stopMemoryMongo();
  await mongoose.disconnect();
  console.log('Done. All images are Unsplash placeholders — replace via Media Manager + hero editor.');
}

run().catch((error) => {
  console.error('Reseed failed:', error);
  process.exit(1);
});
