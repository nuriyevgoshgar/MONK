// Imported with explicit extensions so plain `node` can load this module
// too — the seed and ingestion scripts run without a TypeScript runner.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

// Prisma 7 talks to the database through a driver adapter. The pool is created
// once per process; Next reloads modules on every edit in dev, which is what
// the global below guards against.
function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

// Next.js reloads modules on every edit in dev; without this the process would
// open a new database connection per reload.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
