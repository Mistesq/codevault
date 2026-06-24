import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 configuration. The CLI no longer auto-loads `.env`, so we load it
// explicitly above. The runtime client (src/lib/prisma.ts) gets its connection
// via the @prisma/adapter-pg driver adapter, not from here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma Migrate / CLI uses a direct (non-pooled) connection when available
    // — DIRECT_URL is set in production — and falls back to DATABASE_URL locally.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
