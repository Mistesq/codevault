import { beforeEach, describe, expect, it, vi } from "vitest";

// The reset routine is tested by mocking the Prisma singleton (transaction
// callback invoked with a tx mock) and the content-insert routine — no real DB.
const { prisma, tx, insertDemoContent } = vi.hoisted(() => {
  const tx = {
    user: { updateMany: vi.fn() },
    item: { deleteMany: vi.fn() },
    collection: { deleteMany: vi.fn() },
    tag: { deleteMany: vi.fn() },
    itemType: { deleteMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
    insertDemoContent: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/demo/insert-demo-content", () => ({
  insertDemoContent: (...args: unknown[]) => insertDemoContent(...args),
}));

import { DEMO_RESET_WINDOW_MS, resetDemoWorkspace } from "@/lib/demo/reset";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) =>
    fn(tx),
  );
});

describe("resetDemoWorkspace", () => {
  it("wipes the workspace and re-seeds when the throttle window is claimed", async () => {
    tx.user.updateMany.mockResolvedValue({ count: 1 });

    const status = await resetDemoWorkspace("demo_1");

    expect(status).toBe("reset");
    expect(tx.item.deleteMany).toHaveBeenCalledWith({
      where: { userId: "demo_1" },
    });
    expect(tx.collection.deleteMany).toHaveBeenCalledWith({
      where: { userId: "demo_1" },
    });
    expect(tx.tag.deleteMany).toHaveBeenCalledWith({
      where: { userId: "demo_1" },
    });
    expect(tx.itemType.deleteMany).toHaveBeenCalledWith({
      where: { userId: "demo_1" },
    });
    // The seed insert runs inside the same transaction as the wipe.
    expect(insertDemoContent).toHaveBeenCalledWith(tx, "demo_1");
  });

  it("claims the window with a non-spoofable, window-scoped predicate", async () => {
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    const before = Date.now();

    await resetDemoWorkspace("demo_1");

    const args = tx.user.updateMany.mock.calls[0][0];
    // isDemo re-checked in the DB predicate: calling this with a regular
    // user's id can never reset (or timestamp) their account.
    expect(args.where.id).toBe("demo_1");
    expect(args.where.isDemo).toBe(true);
    // Window: null (never reset) or older than now - DEMO_RESET_WINDOW_MS.
    const [neverReset, stale] = args.where.OR;
    expect(neverReset).toEqual({ demoLastResetAt: null });
    const cutoff = stale.demoLastResetAt.lt.getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before - DEMO_RESET_WINDOW_MS);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - DEMO_RESET_WINDOW_MS);
    expect(args.data.demoLastResetAt).toBeInstanceOf(Date);
  });

  it("skips silently when a reset already ran inside the window", async () => {
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    const status = await resetDemoWorkspace("demo_1");

    expect(status).toBe("skipped");
    expect(tx.item.deleteMany).not.toHaveBeenCalled();
    expect(tx.collection.deleteMany).not.toHaveBeenCalled();
    expect(insertDemoContent).not.toHaveBeenCalled();
  });

  it("fails open: a reset error is logged and swallowed, never thrown", async () => {
    prisma.$transaction.mockRejectedValue(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const status = await resetDemoWorkspace("demo_1");

    expect(status).toBe("failed");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("deletes items before item types (FK on Item.typeId has no cascade)", async () => {
    tx.user.updateMany.mockResolvedValue({ count: 1 });

    await resetDemoWorkspace("demo_1");

    const itemOrder = tx.item.deleteMany.mock.invocationCallOrder[0];
    const typeOrder = tx.itemType.deleteMany.mock.invocationCallOrder[0];
    expect(itemOrder).toBeLessThan(typeOrder);
  });
});
