import { defineConfig } from "prisma/config";

// Node loads .env natively (>= 20.12), so Prisma needs no dotenv dependency.
// The file is optional: Vercel and CI inject DATABASE_URL through the
// environment instead.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env on disk — fall through to whatever the environment already has.
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env (see README).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
