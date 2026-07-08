import "server-only";

import { prisma } from "@/lib/prisma";
import { insertDemoContent } from "@/lib/demo/insert-demo-content";

/**
 * Minimum time between demo workspace resets. A login shortly after a previous
 * reset skips silently, so one visitor's login doesn't wipe another's
 * in-progress session every few minutes.
 */
export const DEMO_RESET_WINDOW_MS = 30 * 60 * 1000;

export type DemoResetStatus = "reset" | "skipped" | "failed";

/**
 * Reset the demo user's workspace to the canonical seed, at most once per
 * throttle window. Runs as one transaction so there is never an empty or
 * half-seeded intermediate state:
 *
 * 1. Claim the throttle window via a conditional `updateMany` on the user row
 *    (`isDemo: true` re-checked server-side so a spoofed caller can never reset
 *    a regular account). Under concurrent logins Postgres row-locking makes the
 *    losing transaction re-evaluate the predicate and skip.
 * 2. Wipe all demo-owned content (cascades clear the ItemTag / ItemCollection
 *    join rows) and re-insert the canonical seed.
 *
 * Fail-open by design: any error is logged and swallowed — a broken reset must
 * never block the demo login itself.
 */
export async function resetDemoWorkspace(
  userId: string,
): Promise<DemoResetStatus> {
  try {
    return await prisma.$transaction(async (tx) => {
      const cutoff = new Date(Date.now() - DEMO_RESET_WINDOW_MS);
      const claimed = await tx.user.updateMany({
        where: {
          id: userId,
          isDemo: true,
          OR: [
            { demoLastResetAt: null },
            { demoLastResetAt: { lt: cutoff } },
          ],
        },
        data: { demoLastResetAt: new Date() },
      });
      if (claimed.count === 0) return "skipped";

      // Items first: custom ItemTypes (if any ever exist) are referenced by
      // items without a cascade, so they can only go once their items are gone.
      await tx.item.deleteMany({ where: { userId } });
      await tx.collection.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });
      await tx.itemType.deleteMany({ where: { userId } });

      await insertDemoContent(tx, userId);
      return "reset";
    });
  } catch (error) {
    console.error("Demo workspace reset failed (login proceeds):", error);
    return "failed";
  }
}
