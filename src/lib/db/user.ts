import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  DEFAULT_EDITOR_PREFERENCES,
  parseEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/**
 * Resolves the signed-in user (id + the bits the DB helpers need) from the auth
 * session. Returns null when there's no session, so callers that run outside a
 * guaranteed-authenticated context (e.g. API routes) can turn that into a 401
 * and page helpers can short-circuit to empty results. Wrapped in React
 * `cache()` so the many DB helpers that need the user share a single lookup per
 * server request instead of querying independently.
 */
export const getSessionUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, isPro: true },
  });
});

export interface CurrentUser {
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

/**
 * The signed-in user for the sidebar footer / profile, read from the auth
 * session. `isPro` comes from the database (the JWT doesn't carry it), reusing
 * getSessionUser's React-`cache()`d lookup so the app shell doesn't issue a
 * second identical query. Callers must guarantee an authenticated session (e.g.
 * the dashboard layout's `auth()` guard); a missing session is a bug, so we
 * throw rather than silently rendering a placeholder identity. Wrapped in
 * `cache()` so repeated calls within one request share the work.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    throw new Error("getCurrentUser called without an authenticated session");
  }

  const dbUser = await getSessionUser();

  return {
    name: sessionUser.name ?? "User",
    email: sessionUser.email ?? "",
    image: sessionUser.image ?? null,
    isPro: dbUser?.isPro ?? false,
  };
});

/**
 * The signed-in user's Monaco editor preferences, read from the JSON column and
 * normalized into a complete object (every field filled with its default when
 * missing or invalid). Returns the defaults when there's no session so callers
 * outside a guaranteed-authenticated context still get a usable object. Wrapped
 * in React `cache()` so the app shell shares one lookup per request.
 */
export const getEditorPreferences = cache(
  async (): Promise<EditorPreferences> => {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return { ...DEFAULT_EDITOR_PREFERENCES };

    const user = await prisma.user.findUnique({
      where: { id },
      select: { editorPreferences: true },
    });

    return parseEditorPreferences(user?.editorPreferences);
  },
);
