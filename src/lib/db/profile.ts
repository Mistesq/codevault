import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { countItemsByType, sortByTypeOrder } from "@/lib/db/items";

// Profile data is scoped to the signed-in user (session.user.id), matching the
// rest of the domain layer (all queries resolve the user from the auth session).

export interface ProfileTypeCount {
  name: string;
  // lucide icon-name string, resolved in the UI via getTypeIcon().
  icon: string | null;
  color: string | null;
  count: number;
}

export interface ProfileData {
  name: string;
  email: string;
  image: string | null;
  // ISO string so it crosses the server/client boundary cleanly.
  createdAt: string;
  isPro: boolean;
  // Shared public demo account — account-level controls are hidden in the UI
  // (the server actions enforce the actual block).
  isDemo: boolean;
  // Whether the account has a password set — gates the change-password action
  // (GitHub OAuth-only accounts have no password).
  hasPassword: boolean;
  totalItems: number;
  totalCollections: number;
  // One entry per system item type (including zero counts), in sidebar order.
  typeBreakdown: ProfileTypeCount[];
}

/**
 * All data for the profile page, scoped to the signed-in user. Callers must
 * guarantee an authenticated session (the page's own `auth()` guard); a missing
 * session is a bug, so we throw rather than render a placeholder identity.
 */
export async function getProfileData(): Promise<ProfileData> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("getProfileData called without an authenticated session");
  }

  const [user, totalItems, totalCollections, systemTypes, countByType] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          image: true,
          createdAt: true,
          isPro: true,
          isDemo: true,
          password: true,
        },
      }),
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.itemType.findMany({
        where: { isSystem: true },
        select: { id: true, name: true, icon: true, color: true },
      }),
      countItemsByType(userId),
    ]);

  if (!user) {
    throw new Error("getProfileData: signed-in user not found in database");
  }

  const typeBreakdown: ProfileTypeCount[] = sortByTypeOrder(systemTypes).map(
    (type) => ({
      name: type.name,
      icon: type.icon,
      color: type.color,
      count: countByType.get(type.id) ?? 0,
    }),
  );

  return {
    name: user.name ?? "User",
    email: user.email,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    isPro: user.isPro,
    isDemo: user.isDemo,
    hasPassword: user.password !== null,
    totalItems,
    totalCollections,
    typeBreakdown,
  };
}
