import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';
import { createRequire } from 'node:module';

dotenv.config();

const RESOLVER_SETS: string[][] = [
  ['8.8.8.8', '1.1.1.1'],
  ['1.1.1.1', '8.8.8.8'],
  ['9.9.9.9', '149.112.112.112'],
  ['208.67.222.222', '208.67.220.220'],
];

const SYSTEM_SERVERS: string[] = dns.getServers();

/**
 * Minimal structural type for the in-memory MongoDB handle.
 *
 * mongodb-memory-server is a dev-only dependency and is loaded lazily at
 * runtime (never at module load). It is intentionally not imported here — the
 * dev fallback uses `createRequire(...)('mongodb-memory-server')` instead, which
 * TypeScript never resolves at compile time. The production build therefore
 * works even when the package is not installed, and the production runtime
 * never loads the module.
 */
interface MemoryMongoHandle {
  getUri: (dbName?: string) => string;
  stop: () => Promise<void>;
}

let memMongo: MemoryMongoHandle | null = null;

// An ephemeral in-memory database is a development-only convenience. In
// production it would silently discard all data on restart, so fail fast.
const refuseInMemoryInProduction = (): void => {
  if (process.env.NODE_ENV === 'production') {
    console.error('MONGODB_URI is required in production. Set MONGODB_URI to a valid MongoDB Atlas connection string — refusing to start an in-memory MongoDB fallback.');
    process.exit(1);
  }
};

const startMemoryMongo = async (): Promise<MemoryMongoHandle> => {
  refuseInMemoryInProduction();
  console.log('MONGODB_URI not set — starting in-memory MongoDB (development fallback)');
  // Local-development-only: loaded lazily via CommonJS require so the package
  // is never resolved at build time and is never required in production.
  const nodeRequire = createRequire(__filename);
  const { MongoMemoryServer, MongoMemoryReplSet } = nodeRequire('mongodb-memory-server') as {
    MongoMemoryServer: { create: (options?: Record<string, unknown>) => Promise<MemoryMongoHandle> };
    MongoMemoryReplSet: { create: (options?: Record<string, unknown>) => Promise<MemoryMongoHandle> };
  };
  // MEMORY_REPLSET=1 starts a single-node replica set so transactional code
  // (e.g. order placement) works against the in-memory database.
  if (process.env.MEMORY_REPLSET === '1') {
    return MongoMemoryReplSet.create({ replSet: { count: 1 } });
  }
  return MongoMemoryServer.create();
};

export const getMongoUri = async (): Promise<string> => {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) return configured;

  // Reuse an existing in-memory instance so scripts can share the same database
  // within one process.
  if (memMongo) return memMongo.getUri('bristi');

  memMongo = await startMemoryMongo();
  return memMongo.getUri('bristi');
};

export const stopMemoryMongo = async (): Promise<void> => {
  if (memMongo) {
    await memMongo.stop();
    memMongo = null;
  }
};

async function tryConnect(resolverSet: string[]): Promise<boolean> {
  const configured = process.env.MONGODB_URI?.trim();
  if (!configured) return false;
  dns.setServers(resolverSet);
  try {
    const conn = await mongoose.connect(configured, { serverSelectionTimeoutMS: 10000 } as any);
    console.log(`MongoDB Connected: ${conn.connection.host} (dns: ${resolverSet.join(', ')})`);
    return true;
  } catch (error: any) {
    console.error(`MongoDB (dns: ${resolverSet.join(', ')}) connection failed: ${error.message}`);
    await mongoose.disconnect().catch(() => undefined);
    return false;
  }
}

const connectDB = async () => {
  const configured = process.env.MONGODB_URI?.trim();

  if (!configured) {
    // Production must always connect to MongoDB Atlas via MONGODB_URI; the
    // in-memory fallback below is strictly a local-development convenience.
    refuseInMemoryInProduction();
    console.log('MONGODB_URI not set — starting in-memory MongoDB (development fallback)');
  } else {
    const seen = new Set<string>();
    const sets = [...RESOLVER_SETS, SYSTEM_SERVERS]
      .map((set) => set.filter(Boolean))
      .filter((set) => {
        const key = set.join(',');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    for (const set of sets) {
      if (await tryConnect(set)) return;
    }
    console.error('All DNS resolver sets failed — falling back to in-memory MongoDB (development fallback)...');
    refuseInMemoryInProduction();
  }

  // Only reached in local development: MONGODB_URI is absent, or Atlas was
  // unreachable with NODE_ENV !== 'production'.
  try {
    memMongo = await startMemoryMongo();
    const uri = memMongo.getUri('bristi');
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected (in-memory fallback): ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`In-memory MongoDB fallback failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
