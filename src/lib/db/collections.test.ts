import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma singleton and the demo-user resolver so this is a true unit
// test — no database. We assert the create is user-scoped and mapped into the
// DashboardCollection shape. `vi.hoisted` lets the mocks exist before the
// hoisted factories.
const { collection } = vi.hoisted(() => ({
  collection: { create: vi.fn() },
}));
const { getDemoUser } = vi.hoisted(() => ({
  getDemoUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { collection },
}));
vi.mock("@/lib/db/user", () => ({
  getDemoUser,
}));

import { createCollection } from "@/lib/db/collections";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCollection", () => {
  const data = { name: "React Patterns", description: "Hooks & co." };

  it("returns null when there is no demo user (no write)", async () => {
    getDemoUser.mockResolvedValue(null);

    const result = await createCollection(data);

    expect(result).toBeNull();
    expect(collection.create).not.toHaveBeenCalled();
  });

  it("creates the collection scoped to the demo user", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    collection.create.mockResolvedValue({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
    });

    const result = await createCollection(data);

    expect(collection.create).toHaveBeenCalledWith({
      data: {
        name: "React Patterns",
        description: "Hooks & co.",
        userId: "user_1",
      },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    // Mapped into the DashboardCollection shape — empty, no items yet.
    expect(result).toEqual({
      id: "col_new",
      name: "React Patterns",
      description: "Hooks & co.",
      isFavorite: false,
      itemCount: 0,
      borderColor: null,
      types: [],
    });
  });

  it("passes a null description straight through", async () => {
    getDemoUser.mockResolvedValue({ id: "user_1" });
    collection.create.mockResolvedValue({
      id: "col_2",
      name: "Solo",
      description: null,
      isFavorite: false,
    });

    const result = await createCollection({ name: "Solo", description: null });

    expect(collection.create.mock.calls[0][0].data.description).toBeNull();
    expect(result?.description).toBeNull();
  });
});
