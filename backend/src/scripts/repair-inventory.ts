/**
 * Repair inventory documents created before `location` became an object.
 *
 * The `backfill-inventory-ledger` migration originally wrote inventory items
 * without a `location`, which violates the schema (`location.warehouse` is
 * required) and crashes the admin Inventory page (`item.location.warehouse`).
 *
 * This script is idempotent: items that already have a valid object location
 * are left untouched.
 *
 * Usage: npm run db:repair-inventory --workspace=backend
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { getMongoUri } from '../config/database';
import { InventoryItemModel } from '../models/InventoryItem';

dotenv.config();

const RESOLVER_SETS: string[][] = [
  ['8.8.8.8', '1.1.1.1'],
  ['1.1.1.1', '8.8.8.8'],
  ['9.9.9.9', '149.112.112.112'],
  ['208.67.222.222', '208.67.220.220'],
];

async function connect() {
  const uri = await getMongoUri();
  const seen = new Set<string>();
  const sets = [...RESOLVER_SETS, dns.getServers()]
    .map((set) => set.filter(Boolean))
    .filter((set) => {
      const key = set.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  for (const set of sets) {
    dns.setServers(set);
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 } as any);
      console.log(`Connected (dns: ${set.join(', ')}) -> ${conn.connection.host}`);
      return;
    } catch (error: any) {
      console.error(`Connection failed (dns: ${set.join(', ')}): ${error.message}`);
      await mongoose.disconnect().catch(() => undefined);
    }
  }
  throw new Error('All DNS resolver sets failed');
}

async function main() {
  await connect();

  const missing = await InventoryItemModel.find({
    $or: [
      { location: { $exists: false } },
      { location: null },
      { location: { $type: 'string' } },
      { 'location.warehouse': { $exists: false } },
    ],
  });

  console.log(`Found ${missing.length} inventory item(s) missing a warehouse location`);

  let fixed = 0;
  for (const item of missing) {
    const location = item.location;
    const patch: any = { lastUpdated: new Date() };

    if (!location || typeof location !== 'object') {
      patch.location = { warehouse: 'Main' };
    } else {
      patch['location.warehouse'] = 'Main';
    }

    await InventoryItemModel.updateOne({ _id: item._id }, { $set: patch });
    fixed++;
  }

  // Re-validate against the schema: ensure required fields exist for every item.
  const invalid = await InventoryItemModel.countDocuments({
    $or: [
      { sku: { $exists: false } },
      { quantity: { $exists: false } },
      { 'location.warehouse': { $exists: false } },
    ],
  });

  console.log(`Repaired ${fixed} item(s)`);
  console.log(`Remaining invalid documents: ${invalid}`);

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((error) => {
  console.error('Repair failed:', error);
  process.exit(1);
});
