import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// The dashboard's domain data (items/collections) is still scoped to the seeded
// demo user until ownership is migrated to the signed-in user.
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
  email: string;
  image: string | null;
  isPro: boolean;
}

/**
 * The signed-in user for the sidebar footer / profile, read from the auth
 * session. `isPro` is read fresh from the database (the JWT doesn't carry it).
 * Callers must guarantee an authenticated session (e.g. the dashboard layout's
 * `auth()` guard); a missing session is a bug, so we throw rather than silently
 * rendering a placeholder identity.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    throw new Error("getCurrentUser called without an authenticated session");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { isPro: true },
  });

  return {
    name: sessionUser.name ?? "User",
    email: sessionUser.email ?? "",
    image: sessionUser.image ?? null,
    isPro: dbUser?.isPro ?? false,
  };
}
