import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Connectivity + seed-data inspection for the Neon/Postgres database.
// Run with: npm run db:test
const DEMO_EMAIL = "demo@codevault.io";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — add it to your .env file.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();

    const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now()`;
    console.log("✅ Database connection OK");
    console.log(`   Server time: ${now.toISOString()}\n`);

    // --- Demo user ---
    const user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });

    if (!user) {
      console.log(
        `⚠️  No demo user (${DEMO_EMAIL}) found. Run "npm run db:seed" first.`,
      );
      return;
    }

    console.log("👤 Demo user");
    console.log(`   ${user.name} <${user.email}>`);
    console.log(`   isPro: ${user.isPro} · hasPassword: ${!!user.password}`);
    console.log(
      `   emailVerified: ${user.emailVerified?.toISOString() ?? "—"}\n`,
    );

    // --- System item types ---
    const types = await prisma.itemType.findMany({
      where: { isSystem: true },
      orderBy: { name: "asc" },
    });
    console.log(`🏷️  System item types (${types.length})`);
    for (const t of types) {
      console.log(`   ${t.name.padEnd(8)} ${t.icon ?? "—"} ${t.color ?? ""}`);
    }
    console.log();

    // --- Collections + items ---
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: { type: { select: { name: true } } },
        },
      },
    });

    console.log(`📚 Collections (${collections.length})`);
    for (const c of collections) {
      console.log(`\n   ▸ ${c.name} — ${c.description ?? ""} (${c.items.length} items)`);
      for (const item of c.items) {
        const meta = item.url ?? item.language ?? "";
        console.log(
          `      • [${item.type.name}] ${item.title}${meta ? `  (${meta})` : ""}`,
        );
      }
    }

    const totalItems = collections.reduce((sum, c) => sum + c.items.length, 0);
    console.log(
      `\n📊 Totals — types: ${types.length}, collections: ${collections.length}, items: ${totalItems}`,
    );

    // Sanity checks against the seed spec.
    const expected = { types: 7, collections: 5, items: 18 };
    const ok =
      types.length === expected.types &&
      collections.length === expected.collections &&
      totalItems === expected.items;
    console.log(
      ok
        ? "✅ Seed data matches expected counts."
        : `⚠️  Counts differ from expected (${expected.types}/${expected.collections}/${expected.items}). Re-run "npm run db:seed".`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Database test failed:");
  console.error(err);
  process.exit(1);
});
