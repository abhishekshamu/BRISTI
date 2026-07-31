import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

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

const connectDB = async () => {
  const configured = process.env.MONGODB_URI?.trim();

  if (configured) {
    try {
      const conn = await mongoose.connect(configured, { serverSelectionTimeoutMS: 15000 } as any);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error: any) {
      console.error(`MongoDB (${configured}) connection failed: ${error.message}`);
      console.error('Falling back to in-memory MongoDB (development fallback)...');
    }
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
