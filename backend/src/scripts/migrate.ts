import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getMongoUri, stopMemoryMongo } from '../config/database';
import { CategoryModel } from '../models/Category';
import { ProductModel } from '../models/Product';
import { CollectionModel } from '../models/Collection';
import { InventoryItemModel } from '../models/InventoryItem';
import { NotificationModel } from '../models/Notification';

dotenv.config();

type Migration = { name: string; description: string; up: () => Promise<void> };

const DEFAULT_SUBTITLES: Record<string, string> = {
  'oversized-t-shirts': 'Relaxed silhouettes crafted for everyday luxury.',
  'japanese-trouser': 'Architectural tailoring with modern proportions.',
  'gurkha-pant': 'Classic military heritage reimagined for modern wardrobes.',
  shackets: 'Versatile layers designed for every season.',
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
    name: 'purge-expired-notifications',
    description: 'Remove expired notifications',
    up: async () => {
      const result = await NotificationModel.deleteMany({ expiresAt: { $lt: new Date() } });
      console.log(`  Purged ${result.deletedCount} expired notification(s).`);
    },
  },
];

async function run(): Promise<void> {
  await mongoose.connect(await getMongoUri());
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
