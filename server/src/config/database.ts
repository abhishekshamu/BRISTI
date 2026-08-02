import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'node:dns';

dotenv.config();

const RESOLVER_SETS: string[][] = [
  ['8.8.8.8', '1.1.1.1'],
  ['1.1.1.1', '8.8.8.8'],
  ['9.9.9.9', '149.112.112.112'],
  ['208.67.222.222', '208.67.220.220'],
];

const SYSTEM_SERVERS: string[] = dns.getServers();

let memMongo: MongoMemoryServer | null = null;

export const getMongoUri = async (): Promise<string> => {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) return configured;

  console.log('MONGODB_URI not set — starting in-memory MongoDB (development fallback)');
  memMongo = await MongoMemoryServer.create();
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

  if (configured) {
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
  } else {
    console.log('MONGODB_URI not set — starting in-memory MongoDB (development fallback)');
  }

  try {
    memMongo = await MongoMemoryServer.create();
    const uri = memMongo.getUri('bristi');
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected (in-memory fallback): ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`In-memory MongoDB fallback failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
