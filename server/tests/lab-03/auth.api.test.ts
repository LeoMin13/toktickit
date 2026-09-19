import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const agent = () => request.agent(app);

describe("POST /api/auth/login", () => {
  it("logs in successfully with valid credentials (API-01)", async () => {
    const res = await agent().post("/api/auth/login").send({
      email: "jennifer.anderson@example.com",
      password: "Requester123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("REQUESTER");
  });

  it("rejects an invalid password with a generic message (API-02)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "jennifer.anderson@example.com",
      password: "WrongPassword!",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("rejects an inactive account with the SAME generic message (API-02)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "former.employee@example.com",
      password: "Requester123!",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });
});

describe("GET /api/auth/me and logout", () => {
  it("rejects an unauthenticated request (401)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user when authenticated, then rejects after logout (API-03)", async () => {
    const client = agent();
    await client.post("/api/auth/login").send({
      email: "jennifer.anderson@example.com",
      password: "Requester123!",
    });

    const me = await client.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("Jennifer Anderson");

    await client.post("/api/auth/logout");

    const afterLogout = await client.get("/api/auth/me");
    expect(afterLogout.status).toBe(401);
  });
});

describe("POST /api/auth/change-password", () => {
  it("changes the password and clears mustChangePassword (AC-02)", async () => {
    const client = agent();
    await client.post("/api/auth/login").send({
      email: "alex.thompson@tiktockit.com",
      password: "Staff123!",
    });

    const res = await client.post("/api/auth/change-password").send({
      currentPassword: "Staff123!",
      newPassword: "NewStaff123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(false);

    // revert for test idempotency
    await client.post("/api/auth/change-password").send({
      currentPassword: "NewStaff123!",
      newPassword: "Staff123!",
    });
  });

  it("rejects a weak new password (API-04)", async () => {
    const client = agent();
    await client.post("/api/auth/login").send({
      email: "alex.thompson@tiktockit.com",
      password: "Staff123!",
    });

    const res = await client.post("/api/auth/change-password").send({
      currentPassword: "Staff123!",
      newPassword: "weak",
    });
    expect(res.status).toBe(400);
    expect(res.body.fields.newPassword).toBeDefined();
  });
});