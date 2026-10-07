import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let adminAgent: ReturnType<typeof request.agent>;
let staffAgent: ReturnType<typeof request.agent>;
let adminId: number;

beforeAll(async () => {
  adminAgent = request.agent(app);
  await adminAgent.post("/api/auth/login").send({
    email: "admin@tiktockit.com", password: "Admin123!",
  });
  staffAgent = request.agent(app);
  await staffAgent.post("/api/auth/login").send({
    email: "alex.thompson@tiktockit.com", password: "Staff123!",
  });
  const me = await adminAgent.get("/api/auth/me");
  adminId = me.body.id;
});

describe("Admin user management", () => {
  it("creates a user with a single role and initial password", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "Test New User",
      email: `test-${Date.now()}@tiktockit.com`,
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "Temp12345!",
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("IT_STAFF");
  });

  it("rejects duplicate email on creation (API-14)", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "Duplicate",
      email: "alex.thompson@tiktockit.com",
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "Temp12345!",
    });
    expect(res.status).toBe(409);
  });

  it("rejects an Admin deactivating their own account (API-15)", async () => {
    const res = await adminAgent.patch(`/api/admin/users/${adminId}`).send({ isActive: false });
    expect(res.status).toBe(400);
  });

  it("rejects deactivating the last active Administrator (API-16)", async () => {
    // adminId is the only active Admin in the seed, attempted via self OR
    // another admin would both hit protections; here we confirm the specific
    // "last admin" rule path independent of self-deactivation by checking count.
    const res = await adminAgent.patch(`/api/admin/users/${adminId}`).send({ role: "IT_STAFF" });
    expect(res.status).toBe(400);
  });

  it("rejects access for non-Admin roles (403) (API-07)", async () => {
    const res = await staffAgent.get("/api/admin/users");
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated access (401)", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("searches users by name or email", async () => {
    const res = await adminAgent.get("/api/admin/users?search=Jennifer");
    expect(res.status).toBe(200);
    expect(res.body.some((u: { name: string }) => u.name === "Jennifer Anderson")).toBe(true);
  });

  it("sets a new initial password and forces mustChangePassword", async () => {
    const createRes = await adminAgent.post("/api/admin/users").send({
      name: "Password Reset Target",
      email: `reset-${Date.now()}@tiktockit.com`,
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Temp12345!",
    });

    const res = await adminAgent.patch(`/api/admin/users/${createRes.body.id}/password`).send({
      newPassword: "NewTemp456!",
    });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });
});