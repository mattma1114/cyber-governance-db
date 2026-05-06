import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    setCookie: () => {},
    clearCookie: () => {},
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    setCookie: () => {},
    clearCookie: () => {},
  };
}

describe("siteSettings tRPC procedures", () => {
  it("getPublic should return settings without authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const settings = await caller.siteSettings.getPublic();
    expect(Array.isArray(settings)).toBe(true);
    expect(settings.length).toBeGreaterThan(0);
  });

  it("getPublic should include home group settings", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const settings = await caller.siteSettings.getPublic();
    const homeSettings = settings.filter((s) => s.group === "home");
    expect(homeSettings.length).toBeGreaterThan(0);
  });

  it("getAll should require authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.siteSettings.getAll()).rejects.toThrow();
  });

  it("getAll should work for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const settings = await caller.siteSettings.getAll();
    expect(Array.isArray(settings)).toBe(true);
    expect(settings.length).toBeGreaterThan(0);
  });

  it("updateBatch should work for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const settings = await caller.siteSettings.getAll();
    const homeBadge = settings.find((s) => s.key === "home.badge");

    const originalValue = homeBadge.value;
    await caller.siteSettings.updateBatch([
      { key: "home.badge", value: "测试标签" },
    ]);

    const updated = await caller.siteSettings.getAll();
    const updatedBadge = updated.find((s) => s.key === "home.badge");
    expect(updatedBadge?.value).toBe("测试标签");

    // Restore
    await caller.siteSettings.updateBatch([
      { key: "home.badge", value: originalValue },
    ]);
  });
});
