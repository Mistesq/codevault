import { prisma } from "@/lib/prisma";

// Until auth exists, the dashboard reads the seeded demo user's data.
const DEMO_EMAIL = "demo@codevault.io";

export interface CurrentUser {
  name: string;
  isPro: boolean;
}

/**
 * The signed-in user for the sidebar footer. Falls back to a sensible default
 * if the demo user is missing (e.g. before seeding).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { name: true, isPro: true },
  });

  return { name: user?.name ?? "User", isPro: user?.isPro ?? false };
}
