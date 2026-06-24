import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
    url: env("DATABASE_URL"),
  },
});
