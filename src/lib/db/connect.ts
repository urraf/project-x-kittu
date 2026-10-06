import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

mongoose.set("strictQuery", true);

/**
 * Returns a cached Mongoose connection. Safe to call from any server code path;
 * connections are reused across hot reloads and serverless invocations.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongoUri, {
        dbName: env.mongoDb,
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      })
      .then((m) => {
        logger.info("db.connected", { db: m.connection.name });
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}
