import { describe, expect, it } from "vitest";
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "sample-user", email: "sample@example.com",
        name: "Sample User", loginMethod: "manus", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("cases router", () => {
  it("stats returns correct shape without DB", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stats = await caller.cases.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("judicial");
    expect(stats).toHaveProperty("regulatory");
    expect(stats).toHaveProperty("legislation");
    expect(stats).toHaveProperty("byTopic");
    expect(stats).toHaveProperty("byJurisdiction");
  });

  it("list returns correct shape without DB", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.cases.list({ page: 1, pageSize: 10 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("admin-only procedures reject non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.cases.listAdmin({ page: 1, pageSize: 10 })
    ).rejects.toThrow();
  });
});

describe("topics router", () => {
  it("list returns array without DB", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.topics.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("platforms router", () => {
  it("list returns paginated object without DB", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.platforms.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("listAdmin rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.platforms.listAdmin()).rejects.toThrow();
  });

  it("create rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.platforms.create({ id: "test", name: "Test Platform" })
    ).rejects.toThrow();
  });

  it("update rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.platforms.update({ id: "test", name: "Updated" })
    ).rejects.toThrow();
  });
});

describe("topics admin mutations", () => {
  it("create rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.topics.create({ id: "test", label: "Test Topic" })
    ).rejects.toThrow();
  });

  it("update rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.topics.update({ id: "test", label: "Updated" })
    ).rejects.toThrow();
  });

  it("delete rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.topics.delete({ id: "test" })
    ).rejects.toThrow();
  });
});

describe("jurisdictions admin mutations", () => {
  it("create rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.jurisdictions.create({ id: "test", label: "Test" })
    ).rejects.toThrow();
  });

  it("delete rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.jurisdictions.delete({ id: "test" })
    ).rejects.toThrow();
  });
});
