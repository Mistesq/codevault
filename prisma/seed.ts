import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { insertDemoContent } from "../src/lib/demo/insert-demo-content";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — add it to your .env file.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@codevault.io";

const SYSTEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "URL", icon: "Link", color: "#10b981" },
];

async function main() {
  // Idempotent: remove prior demo data so the script can be re-run safely.
  // Deleting the user cascades their items/collections/tags; system types
  // (userId null) are removed separately once no items reference them.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  await prisma.itemType.deleteMany({ where: { isSystem: true } });

  const password = await bcrypt.hash("12345678", 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      password,
      isPro: false,
      // Shared public demo account: account mutations are blocked and the
      // workspace resets to the canonical seed on login (see src/lib/demo/).
      isDemo: true,
      // Freshly seeded content is already canonical — start the throttle
      // window now so the first login doesn't immediately re-run the reset.
      demoLastResetAt: new Date(),
      emailVerified: new Date(),
    },
  });

  // System item types (shared across all users).
  for (const t of SYSTEM_TYPES) {
    await prisma.itemType.create({ data: { ...t, isSystem: true } });
  }

  // Demo workspace content comes from the same canonical module the
  // reset-on-login routine uses, so "fresh deploy" and "just reset" states
  // can never drift apart.
  await insertDemoContent(prisma, user.id);

  const [collections, items, types] = await Promise.all([
    prisma.collection.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id } }),
    prisma.itemType.count({ where: { isSystem: true } }),
  ]);

  console.log("✅ Seed complete");
  console.log(`   User:        ${user.email} (demo, canonical content)`);
  console.log(`   Item types:  ${types}`);
  console.log(`   Collections: ${collections}`);
  console.log(`   Items:       ${items}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
