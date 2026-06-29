import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";

// Unit-test the editor-preferences DB helper by mocking its collaborators (the
// auth session and the Prisma singleton) — no real session or database. The
// real parseEditorPreferences runs (it's a pure util, tested separately), so we
// also confirm the helper normalizes whatever the column holds.
const { auth, user } = vi.hoisted(() => ({
  auth: vi.fn(),
  user: { findUnique: vi.fn() },
}));

vi.mock("@/auth", () => ({
  auth: () => auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user },
}));

import { getEditorPreferences } from "@/lib/db/user";

const signedIn = { user: { id: "user_1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEditorPreferences", () => {
  it("returns the defaults and skips the query when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await getEditorPreferences();

    expect(result).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the stored preferences scoped to the signed-in user", async () => {
    auth.mockResolvedValue(signedIn);
    const stored = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "monokai",
    };
    user.findUnique.mockResolvedValue({ editorPreferences: stored });

    const result = await getEditorPreferences();

    expect(result).toEqual(stored);
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { editorPreferences: true },
    });
  });

  it("falls back to the defaults when the column is null", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ editorPreferences: null });

    expect(await getEditorPreferences()).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("normalizes a partial/invalid stored value", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({
      editorPreferences: { fontSize: 18, theme: "bogus" },
    });

    expect(await getEditorPreferences()).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 18,
    });
  });
});
