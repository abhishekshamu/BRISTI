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
    if (doc.animationSpeed === undefined) {
      doc.animationSpeed = 4.5;
      changed = true;
    }

    const slides = Array.isArray(doc.slides) && doc.slides.length > 0
      ? doc.slides
      : Array.isArray(doc.panels) && doc.panels.length > 0
        ? doc.panels.flatMap((p: any) => (Array.isArray(p.slides) ? p.slides : []))
        : [];

    if (Array.isArray(doc.slides) && doc.slides.length === 0 && slides.length > 0) {
      doc.slides = slides;
      changed = true;
    }

    slides.forEach((slide: any, index: number) => {
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
      if (slide.description === undefined) {
        slide.description = '';
        changed = true;
      }
      if (slide.secondaryButtonText === undefined) {
        slide.secondaryButtonText = '';
        changed = true;
      }
      if (slide.secondaryButtonLink === undefined) {
        slide.secondaryButtonLink = '';
        changed = true;
      }
      if (slide.backgroundColor === undefined) {
        slide.backgroundColor = '';
        changed = true;
      }
      if (slide.animationType === undefined) {
        slide.animationType = 'zoom';
        changed = true;
      }
      if (slide.overlay === undefined) {
        slide.overlay = false;
        changed = true;
      }
      if (slide.overlayOpacity === undefined) {
        slide.overlayOpacity = 45;
        changed = true;
      }
      if (slide.gradient === undefined) {
        slide.gradient = false;
        changed = true;
      }
      if (slide.textAlign === undefined) {
        slide.textAlign = 'left';
        changed = true;
      }
      if (slide.buttonColor === undefined) {
        slide.buttonColor = '';
        changed = true;
      }
      if (slide.animationSpeed === undefined) {
        slide.animationSpeed = 4.5;
        changed = true;
      }
      if (slide.priority === undefined) {
        slide.priority = index;
        changed = true;
      }
      if (slide.visibility === undefined) {
        slide.visibility = { desktop: true, tablet: true, mobile: true };
        changed = true;
      }
    });

    if (changed) {
      delete doc._id;
      delete doc.__v;
      await HeroBlockModel.findByIdAndUpdate(set._id, doc, { runValidators: true }).exec();
      updated += 1;
    }
  }

  console.log(`Migrated ${updated} hero set(s) — flattened to slides (panels kept for reference), per-block defaults applied (content untouched)`);

  await stopMemoryMongo();
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Migrate failed:', error);
  process.exit(1);
});
