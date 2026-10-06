import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let staffAgent: ReturnType<typeof request.agent>;
let requesterAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  staffAgent = request.agent(app);
  await staffAgent.post("/api/auth/login").send({
    email: "alex.thompson@tiktockit.com",
    password: "Staff123!",
  });

  requesterAgent = request.agent(app);
  await requesterAgent.post("/api/auth/login").send({
    email: "jennifer.anderson@example.com",
    password: "Requester123!",
  });

  const categories = await staffAgent.get("/api/categories");
  const systems = await staffAgent.get("/api/related-systems");

  await requesterAgent.post("/api/tickets").send({
    categoryId: categories.body[0].id,
    relatedSystemId: systems.body[0].id,
    summary: "Queue visibility test ticket",
    description: "This ticket exists to test IT Staff queue visibility.",
    requestedPriority: "HIGH",
  });
});

describe("GET /api/staff/tickets", () => {
  it("returns tickets from any requester to IT Staff (API-08)", async () => {
    const res = await staffAgent.get("/api/staff/tickets");
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((t: { summary: string }) => t.summary === "Queue visibility test ticket")
    ).toBe(true);
  });

  it("supports search, sort, and pagination", async () => {
    const res = await staffAgent.get(
      "/api/staff/tickets?search=Queue visibility&sort=createdAt&order=desc&page=1&pageSize=10"
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.page).toBe(1);
  });

  it("rejects access for Requester role (403)", async () => {
    const res = await requesterAgent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated access (401)", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
  });
});