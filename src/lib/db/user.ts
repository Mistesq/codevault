import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Until auth exists, the dashboard reads the seeded demo user's data.
export const DEMO_EMAIL = "demo@codevault.io";

/**
 * Resolves the seeded demo user, standing in for the signed-in user until auth
 * lands. Wrapped in React `cache()` so the many DB helpers that need the user
 * share a single lookup per server request instead of querying independently.
 */
export const getDemoUser = cache(() =>
  prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, name: true, isPro: true },
  }),
);

export interface CurrentUser {
  name: string;
  isPro: boolean;
}

/**
 * The signed-in user for the sidebar footer. Falls back to a sensible default
 * if the demo user is missing (e.g. before seeding).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getDemoUser();
  return { name: user?.name ?? "User", isPro: user?.isPro ?? false };
}
