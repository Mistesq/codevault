import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Delete every user except the demo user, along with all of their content.
//
// Deleting a User cascades (per the Prisma schema) to that user's items,
// collections, tags, custom item types, accounts, and sessions. Shared system
// item types (userId = null) are NOT owned by any user and are left untouched.
// VerificationToken rows aren't linked by a foreign key (they key off email), so
// we clean up any belonging to non-demo addresses separately.
//
// Safe by default: a dry run that only reports what *would* be deleted.
// Pass --yes to actually delete.
//
//   npm run db:prune-users          # dry run
//   npm run db:prune-users -- --yes # delete for real

const DEMO_EMAIL = "demo@codevault.io";

async function main() {
  const apply = process.argv.includes("--yes");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — add it to your .env file.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // Everyone who is not the demo user.
  const where = { email: { not: DEMO_EMAIL } } as const;

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        email: true,
        _count: {
          select: {
            items: true,
            collections: true,
            tags: true,
            itemTypes: true,
            accounts: true,
            sessions: true,
          },
        },
      },
      orderBy: { email: "asc" },
    });

    const orphanTokens = await prisma.verificationToken.count({
      where: { identifier: { not: DEMO_EMAIL } },
    });

    if (users.length === 0 && orphanTokens === 0) {
      console.log(`✅ Nothing to delete — only ${DEMO_EMAIL} exists.`);
      return;
    }

    console.log(
      `${apply ? "Deleting" : "[dry run] Would delete"} ${users.length} user(s) ` +
        `(everyone except ${DEMO_EMAIL}):\n`,
    );
    for (const u of users) {
      const c = u._count;
      console.log(
        `  • ${u.email} — items:${c.items} collections:${c.collections} ` +
          `tags:${c.tags} customTypes:${c.itemTypes} accounts:${c.accounts} ` +
          `sessions:${c.sessions}`,
      );
    }
    console.log(
      `\n  + ${orphanTokens} verification token(s) for non-demo emails\n`,
    );

    if (!apply) {
      console.log("No changes made. Re-run with --yes to delete.");
      return;
    }

    // VerificationToken has no FK to User, so remove these explicitly.
    const tokens = await prisma.verificationToken.deleteMany({
      where: { identifier: { not: DEMO_EMAIL } },
    });

    // Cascades handle each user's items/collections/tags/custom types/accounts/sessions.
    const deleted = await prisma.user.deleteMany({ where });

    console.log(
      `🗑️  Deleted ${deleted.count} user(s) and ${tokens.count} verification token(s).`,
    );
    console.log(`✅ Kept ${DEMO_EMAIL} and all of their content.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
