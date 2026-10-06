/**
 * Starts a persistent local MongoDB for development: no install, no account.
 *   npm run db:local        (keep it running in its own terminal)
 * Data is stored in ./.data/mongodb. Use MongoDB Atlas in production.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = Number(process.env.LOCAL_MONGO_PORT ?? 27017);
const dbPath = path.join(process.cwd(), ".data", "mongodb");

async function main() {
  mkdirSync(dbPath, { recursive: true });
  console.log("Starting local MongoDB (the first run downloads the MongoDB binary, ~100 MB)…");
  const server = await MongoMemoryServer.create({ instance: { port: PORT, dbPath, storageEngine: "wiredTiger" } });
  console.log(`\n✓ Local MongoDB running at ${server.getUri()}`);
  console.log(`  Use in .env.local:  MONGODB_URI=mongodb://127.0.0.1:${PORT}/lifeofkittukun`);
  console.log("  Data folder:", dbPath);
  console.log("  Press Ctrl+C to stop.\n");
  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
