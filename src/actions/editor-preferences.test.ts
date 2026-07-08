import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";

// Mock the action's collaborators: the auth session and the Prisma singleton.
// No real session or database.
const { auth, user } = vi.hoisted(() => ({
  auth: vi.fn(),
  user: { update: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("@/auth", () => ({
  auth: () => auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user },
}));

import { updateEditorPreferences } from "@/actions/editor-preferences";

const signedIn = { user: { id: "user_1" } };

beforeEach(() => {
  vi.clearAllMocks();
  // Regular (non-demo) account is the baseline; the demo test overrides.
  user.findUnique.mockResolvedValue({ isDemo: false });
});

describe("updateEditorPreferences", () => {
  it("rejects when there is no session", async () => {
    auth.mockResolvedValue(null);

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(user.update).not.toHaveBeenCalled();
  });

  it("rejects the demo account (preferences persist on the shared user row)", async () => {
    auth.mockResolvedValue(signedIn);
    user.findUnique.mockResolvedValue({ isDemo: true });

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result).toEqual({
      success: false,
      error: "This action is disabled on the demo account.",
    });
    expect(user.update).not.toHaveBeenCalled();
  });

  it("rejects invalid preferences with the schema's message", async () => {
    auth.mockResolvedValue(signedIn);

    const result = await updateEditorPreferences({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: "solarized",
    });

    expect(result.success).toBe(false);
    expect(user.update).not.toHaveBeenCalled();
  });

  it("persists valid preferences scoped to the signed-in user", async () => {
    auth.mockResolvedValue(signedIn);
    user.update.mockResolvedValue({});

    const prefs = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: "monokai" as const,
    };
    const result = await updateEditorPreferences(prefs);

    expect(result).toEqual({ success: true, data: prefs });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { editorPreferences: prefs },
    });
  });

  it("returns a generic error when the update throws", async () => {
    auth.mockResolvedValue(signedIn);
    user.update.mockRejectedValue(new Error("db down"));

    const result = await updateEditorPreferences(DEFAULT_EDITOR_PREFERENCES);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
