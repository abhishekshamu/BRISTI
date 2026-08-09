import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HeroBlockModel } from '../models/HeroBlock';
import { getMongoUri, stopMemoryMongo } from '../config/database';
import type { HeroBlock, HeroSlide } from '../../shared/types';

dotenv.config();

const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

function block(heading: string, imageId: string, altText: string): HeroSlide {
  return {
    heading,
    image: IMG(imageId, 1000),
    imageMobile: IMG(imageId, 900),
    headingColor: '#FFFFFF',
    showEyebrow: false,
    showCta: false,
    animationType: 'zoom',
    overlay: false,
    overlayOpacity: 45,
    gradient: false,
    textAlign: 'left',
    buttonColor: '',
    animationSpeed: 4.5,
    priority: 0,
    visibility: { desktop: true, tablet: true, mobile: true },
    status: 'published',
    isActive: true,
    altText,
  };
}

const DEMO_SET: Partial<HeroBlock> = {
  name: 'Autumn–Winter 2026 Editorial',
  slides: [
    block('The New Season', 'photo-1490481651871-ab68de25d43d', 'New season campaign — replace with real BRISTI asset'),
    block('Quiet Luxury', 'photo-1441986300917-64674bd600d8', 'Quiet luxury campaign — replace with real BRISTI asset'),
    block('Timeless Craft', 'photo-1521334884684-d80222895322', 'Craft campaign — replace with real BRISTI asset'),
    block('Heavyweight Denim', 'photo-1542272604-787c3835535d', 'Denim campaign — replace with real BRISTI asset'),
    block('City Tailoring', 'photo-1556821840-3a63f95609a7', 'Tailoring campaign — replace with real BRISTI asset'),
    block('Street Icons', 'photo-1483985988355-763728e1935b', 'Street icons campaign — replace with real BRISTI asset'),
    block('Members First', 'photo-1515886657613-9f3515b0c78f', 'Members campaign — replace with real BRISTI asset'),
    block('Private Preview', 'photo-1487222477894-8943e31ef7b2', 'Private preview — replace with real BRISTI asset'),
    block('By Invitation', 'photo-1441986300917-64674bd600d8', 'Invitation campaign — replace with real BRISTI asset'),
  ],
  animationSpeed: 4.5,
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
  console.log(`Created demo hero set: ${created.name} (id ${created._id}) — ${created.slides?.length ?? 0} blocks`);

  await stopMemoryMongo();
  await mongoose.disconnect();
  console.log('Done. All images are Unsplash placeholders — replace via Media Manager + hero editor.');
}

run().catch((error) => {
  console.error('Reseed failed:', error);
  process.exit(1);
});
