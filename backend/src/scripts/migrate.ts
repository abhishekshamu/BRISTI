import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { getMongoUri, stopMemoryMongo } from '../config/database';
import { CategoryModel } from '../models/Category';
import { ProductModel } from '../models/Product';
import { CollectionModel } from '../models/Collection';
import { InventoryItemModel } from '../models/InventoryItem';
import { NotificationModel } from '../models/Notification';
import { MARKETING_COLLECTION_SLUGS } from 'shared/constants';

dotenv.config();

type Migration = { name: string; description: string; up: () => Promise<void> };

const DEFAULT_SUBTITLES: Record<string, string> = {
  'oversized-t-shirts': 'Relaxed silhouettes crafted for everyday luxury.',
  'japanese-trouser': 'Architectural tailoring with modern proportions.',
  'gurkha-pant': 'Classic military heritage reimagined for modern wardrobes.',
  shackets: 'Versatile layers designed for every season.',
};

// Legacy marketing slugs → the independent product flags that replaced them.
const MARKETING_SLUG_TO_FLAG: Record<string, string> = {
  'new-arrival': 'isNewArrival',
  'best-seller': 'isBestSeller',
  trending: 'isTrending',
  sale: 'isOnSale',
  featured: 'isFeatured',
  recommended: 'isRecommended',
  exclusive: 'isExclusive',
  'limited-edition': 'isLimitedEdition',
  'editor-choice': 'isEditorsPick',
  'luxury-collection': 'isPremiumCollection',
};

const migrations: Migration[] = [
  {
    name: 'backfill-category-product-counts',
    description: 'Compute and persist productCount for every category',
    up: async () => {
      const categories = await CategoryModel.find({});
      for (const category of categories) {
        const count = await ProductModel.countDocuments({ category: category._id, status: 'active' });
        await CategoryModel.updateOne({ _id: category._id }, { $set: { productCount: count } });
      }
    },
  },
  {
    name: 'backfill-category-subtitles-and-counts',
    description: 'Add premium subtitles and persist up-to-date productCount for every category',
    up: async () => {
      const categories = await CategoryModel.find({});
      for (const category of categories) {
        const subtitle = category.subtitle || DEFAULT_SUBTITLES[category.slug];
        const count = await ProductModel.countDocuments({ category: category._id, status: 'active' });
        const update: any = { productCount: count };
        if (subtitle) update.subtitle = subtitle;
        await CategoryModel.updateOne({ _id: category._id }, { $set: update });
      }
    },
  },
  {
    name: 'backfill-inventory-ledger',
    description: 'Create inventory items for existing products with base stock',
    up: async () => {
      const products = await ProductModel.find({});
      for (const product of products) {
        const totalStock = product.variants && product.variants.length > 0
          ? product.variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0)
          : product.stock;
        await InventoryItemModel.updateOne(
          { productId: product._id },
          {
            $set: {
              productId: product._id,
              name: product.name,
              sku: product.sku,
              quantity: totalStock,
              lowStockThreshold: product.lowStockThreshold ?? 5,
              trackQuantity: product.trackQuantity ?? true,
              location: { warehouse: 'Main' },
              lastUpdated: new Date(),
            },
          },
          { upsert: true }
        );
      }
    },
  },
  {
    name: 'backfill-collection-products',
    description: 'Populate Collection.products arrays from product collection references',
    up: async () => {
      const products = await ProductModel.find({ collection: { $exists: true, $ne: null } });
      const byCollection: Record<string, string[]> = {};
      for (const product of products) {
        const key = String(product.collection);
        byCollection[key] = byCollection[key] || [];
        byCollection[key].push(String(product._id));
      }
      for (const [collectionId, productIds] of Object.entries(byCollection)) {
        await CollectionModel.updateOne(
          { _id: collectionId },
          { $addToSet: { products: { $each: productIds } } }
        );
      }
    },
  },
  {
    name: 'seed-marketing-collections',
    description: 'Backfill marketing flags from legacy collection assignments + heuristics (collections are never created for marketing sections)',
    up: async () => {
      const now = new Date();
      const products = await ProductModel.find({ status: 'active' });
      let updated = 0;
      for (const product of products) {
        const flags: Record<string, boolean> = {
          isNewArrival: false,
          isBestSeller: false,
          isTrending: false,
          isOnSale: false,
          isFeatured: false,
          isRecommended: false,
          isExclusive: false,
          isLimitedEdition: false,
          isEditorsPick: false,
          isPremiumCollection: false,
        };

        const slugs = new Set<string>((product.collections ?? []).map((s: string) => s.trim()).filter(Boolean));
        for (const [slug, field] of Object.entries(MARKETING_SLUG_TO_FLAG)) {
          if (slugs.has(slug)) flags[field] = true;
        }

        // Heuristic backfill so an existing catalog fills the sections once
        if (product.createdAt && (now.getTime() - new Date(product.createdAt).getTime()) < 1000 * 60 * 60 * 24 * 45) flags.isNewArrival = true;
        if (product.compareAtPrice && product.compareAtPrice > product.price) flags.isOnSale = true;
        if (product.rating && product.rating.count > 0) flags.isBestSeller = true;
        if (product.rating && product.rating.average >= 4.5) flags.isTrending = true;
        if (product.featured) flags.isFeatured = true;

        await ProductModel.updateOne({ _id: product._id }, { $set: flags });
        updated++;
      }
      console.log(`  Backfilled marketing flags on ${updated} product(s).`);
    },
  },
  {
    name: 'flags-from-marketing-collections',
    description: 'Backfill independent marketing flags (isNewArrival, isBestSeller, ...) from existing collection assignments + heuristics',
    up: async () => {
      const now = new Date();
      const products = await ProductModel.find({ status: 'active' });
      let updated = 0;
      for (const product of products) {
        const flags: Record<string, boolean> = {
          isNewArrival: false,
          isBestSeller: false,
          isTrending: false,
          isOnSale: false,
          isFeatured: false,
          isRecommended: false,
          isExclusive: false,
          isLimitedEdition: false,
          isEditorsPick: false,
          isPremiumCollection: false,
        };

        // 1. Existing marketing collection memberships map straight to flags.
        const slugs = new Set<string>((product.collections ?? []).map((s: string) => s.trim()).filter(Boolean));
        if (slugs.has('new-arrival')) flags.isNewArrival = true;
        if (slugs.has('best-seller')) flags.isBestSeller = true;
        if (slugs.has('trending')) flags.isTrending = true;
        if (slugs.has('sale')) flags.isOnSale = true;
        if (slugs.has('featured')) flags.isFeatured = true;
        if (slugs.has('recommended')) flags.isRecommended = true;
        if (slugs.has('exclusive')) flags.isExclusive = true;
        if (slugs.has('limited-edition')) flags.isLimitedEdition = true;
        if (slugs.has('editor-choice')) flags.isEditorsPick = true;
        if (slugs.has('luxury-collection')) flags.isPremiumCollection = true;

        // 2. Heuristics for anything the collections did not already cover.
        if (!flags.isNewArrival && product.createdAt && (now.getTime() - new Date(product.createdAt).getTime()) < 1000 * 60 * 60 * 24 * 45) flags.isNewArrival = true;
        if (!flags.isOnSale && product.compareAtPrice && product.compareAtPrice > product.price) flags.isOnSale = true;
        if (!flags.isBestSeller && product.rating && product.rating.count > 0) flags.isBestSeller = true;
        if (!flags.isTrending && product.rating && product.rating.average >= 4.5) flags.isTrending = true;
        if (!flags.isFeatured && product.featured) flags.isFeatured = true;

        await ProductModel.updateOne({ _id: product._id }, { $set: flags });
        updated++;
      }
      console.log(`  Backfilled marketing flags on ${updated} product(s).`);
    },
  },
  {
    name: 'remove-marketing-collections',
    description: 'Remove the duplicate marketing-collection system — preserve flags, delete fake collection docs, strip fake slugs from products',
    up: async () => {
      // 1. Defensive: any product still carrying a fake marketing slug gets the
      //    corresponding flag set before the slug is removed. Flags never lose data.
      const flagged = await ProductModel.find({ collections: { $in: MARKETING_COLLECTION_SLUGS } });
      let preserved = 0;
      for (const product of flagged) {
        const flags: Record<string, boolean> = {};
        for (const slug of product.collections ?? []) {
          const field = MARKETING_SLUG_TO_FLAG[slug];
          if (field) flags[field] = true;
        }
        if (Object.keys(flags).length > 0) {
          await ProductModel.updateOne({ _id: product._id }, { $set: flags });
          preserved++;
        }
      }

      // 2. Strip the fake slugs from every product's collections array.
      const pull = await ProductModel.updateMany(
        { collections: { $in: MARKETING_COLLECTION_SLUGS } },
        { $pullAll: { collections: MARKETING_COLLECTION_SLUGS } }
      );

      // 3. Delete the fake Collection documents entirely.
      const removed = await CollectionModel.deleteMany({ slug: { $in: MARKETING_COLLECTION_SLUGS } });

      console.log(
        `  Flags preserved on ${preserved} product(s); stripped fake slugs from ${pull.modifiedCount} product(s); deleted ${removed.deletedCount} marketing collection doc(s).`
      );
    },
  },
  {
    name: 'sync-collection-membership-to-products',
    description: 'Sync Collection.products (ObjectId arrays) into product.collections slug arrays for real merchandising collections',
    up: async () => {
      const collections = await CollectionModel.find({ slug: { $nin: MARKETING_COLLECTION_SLUGS } });
      let updated = 0;
      for (const collection of collections) {
        const ids = collection.products ?? [];
        if (!ids.length) continue;
        const result = await ProductModel.updateMany(
          { _id: { $in: ids } },
          { $addToSet: { collections: collection.slug } }
        );
        updated += result.modifiedCount;
        console.log(`  Synced ${result.modifiedCount} product(s) into collection: ${collection.slug}`);
      }
      console.log(`  Synced ${updated} product/collection assignment(s) total.`);
    },
  },
  {
    name: 'purge-expired-notifications',
    description: 'Remove expired notifications',
    up: async () => {
      const result = await NotificationModel.deleteMany({ expiresAt: { $lt: new Date() } });
      console.log(`  Purged ${result.deletedCount} expired notification(s).`);
    },
  },
];

async function run(): Promise<void> {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) {
    // Connect with the same DNS resolver fallback chain as the app server.
    const resolverSets: string[][] = [
      ['8.8.8.8', '1.1.1.1'],
      ['1.1.1.1', '8.8.8.8'],
      ['9.9.9.9', '149.112.112.112'],
      ['208.67.222.222', '208.67.220.220'],
      dns.getServers(),
    ];
    let connected = false;
    for (const set of resolverSets) {
      if (!set.length) continue;
      dns.setServers(set);
      try {
        await mongoose.connect(configured, { serverSelectionTimeoutMS: 10000 } as any);
        console.log(`Connected to database. (dns: ${set.join(', ')})`);
        connected = true;
        break;
      } catch (error: any) {
        console.error(`Connection (dns: ${set.join(', ')}) failed: ${error.message}`);
        await mongoose.disconnect().catch(() => undefined);
      }
    }
    if (!connected) throw new Error('Could not connect to MongoDB with any DNS resolver set');
  } else {
    await mongoose.connect(await getMongoUri());
    console.log('Connected to database (in-memory fallback).');
  }
  console.log('Connected to database.');

  const applied = new Set<string>(
    (await mongoose.connection.db.collection('_migrations').find({}).toArray()).map((r) => r.name)
  );

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`  SKIP ${migration.name} (already applied)`);
      continue;
    }
    console.log(`  RUN  ${migration.name} — ${migration.description}`);
    try {
      await migration.up();
      await mongoose.connection.db.collection('_migrations').insertOne({
        name: migration.name,
        appliedAt: new Date(),
      });
      console.log(`  DONE ${migration.name}`);
    } catch (err) {
      console.error(`  FAIL ${migration.name}:`, err);
      process.exitCode = 1;
      break;
    }
  }

  console.log('Migrations complete.');
  await mongoose.disconnect();
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if ((global as any).__MEMORY_MONGO__) {
      await stopMemoryMongo();
    }
  });
