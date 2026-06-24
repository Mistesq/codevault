import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Standalone connectivity check for the Neon/Postgres database.
// Run with: npm run db:test
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — add it to your .env file.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();

    // Round-trip a trivial query and confirm the schema is reachable.
    const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now()`;
    const userCount = await prisma.user.count();

    console.log("✅ Database connection OK");
    console.log(`   Server time:      ${now.toISOString()}`);
    console.log(`   Users in vault:   ${userCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Database test failed:");
  console.error(err);
  process.exit(1);
});
