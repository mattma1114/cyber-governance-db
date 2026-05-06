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
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, setCookie: () => {}, clearCookie: () => {} };
}

function createUserContext(id = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, setCookie: () => {}, clearCookie: () => {} };
}

function createPublicContext(): TrpcContext {
  return { user: null, setCookie: () => {}, clearCookie: () => {} };
}

describe("users tRPC procedures", () => {
  it("listUsers should require admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("listUsers should require admin role (user context)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("listUsers should return paginated result for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("updateRole should prevent self-demotion", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // Admin trying to change their own role should fail
    await expect(caller.users.updateRole({ userId: 1, role: "user" })).rejects.toThrow();
  });

  it("freezeUser should require admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.users.freeze({ userId: 99, frozen: true })).rejects.toThrow();
  });
});

describe("invites tRPC procedures", () => {
  it("generateInvite should require admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.invites.generate({ note: "test" })).rejects.toThrow();
  });

  it("generateInvite should require admin role (user context)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.invites.generate({ note: "test" })).rejects.toThrow();
  });

  it("generateInvite should return token for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.invites.generate({ note: "test invite" });
    expect(result).toHaveProperty("token");
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
  });

  it("validate should return invalid for non-existent token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.invites.validate({ token: "nonexistent-token-xyz" });
    expect(result.valid).toBe(false);
  });

  it("listInvites should require admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.invites.list()).rejects.toThrow();
  });

  it("listInvites should return array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.invites.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("full invite flow: generate -> validate -> consume", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    // Generate
    const { token } = await adminCaller.invites.generate({ note: "flow test" });
    // Validate (public)
    const publicCaller = appRouter.createCaller(createPublicContext());
    const validation = await publicCaller.invites.validate({ token });
    expect(validation.valid).toBe(true);
    // Consume (user context - user 2)
    const userCaller = appRouter.createCaller(createUserContext(2));
    const consumed = await userCaller.invites.consume({ token });
    expect(consumed.success).toBe(true);
    // Validate again - should be invalid (already used)
    const validation2 = await publicCaller.invites.validate({ token });
    expect(validation2.valid).toBe(false);
  });
});
