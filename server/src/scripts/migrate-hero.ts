import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HeroBlockModel } from '../models/HeroBlock';
import { getMongoUri, stopMemoryMongo } from '../config/database';

dotenv.config();

async function run() {
  const uri = await getMongoUri();
  await mongoose.connect(uri);
  console.log(`Migrating hero sets into: ${uri}`);

  const sets = await HeroBlockModel.find({}).exec();
  let updated = 0;

  for (const set of sets) {
    const doc: any = set.toObject();
    let changed = false;

    if (doc.overlay !== false) {
      doc.overlay = false;
      changed = true;
    }
    if (doc.gradient !== false) {
      doc.gradient = false;
      changed = true;
    }

    for (const panel of doc.panels ?? []) {
      for (const slide of panel.slides ?? []) {
        if (slide.headingColor === undefined) {
          slide.headingColor = '#FFFFFF';
          changed = true;
        }
        if (slide.showEyebrow === undefined) {
          slide.showEyebrow = false;
          changed = true;
        }
        if (slide.showCta === undefined) {
          slide.showCta = false;
          changed = true;
        }
      }
    }

    if (changed) {
      delete doc._id;
      delete doc.__v;
      await HeroBlockModel.findByIdAndUpdate(set._id, doc, { runValidators: true }).exec();
      updated += 1;
    }
  }

  console.log(`Migrated ${updated} hero set(s) — overlays off, per-slide defaults applied (content untouched)`);

  await stopMemoryMongo();
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Migrate failed:', error);
  process.exit(1);
});
