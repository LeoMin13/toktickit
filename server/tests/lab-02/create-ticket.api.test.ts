import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agent: ReturnType<typeof request.agent>;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({
    email: "jennifer.anderson@example.com",
    password: "Requester123!",
  });
  const categories = await agent.get("/api/categories");
  categoryId = categories.body[0].id;
  const systems = await agent.get("/api/related-systems");
  relatedSystemId = systems.body[0].id;
});

function validPayload() {
  return {
    categoryId,
    relatedSystemId,
    summary: "Laptop battery drains quickly",
    description: "My laptop battery drains much faster than usual, even when idle.",
    requestedPriority: "MEDIUM",
  };
}

describe("POST /api/tickets", () => {
  it("creates a ticket and returns a unique ticket number (API-01)", async () => {
    const res = await agent.post("/api/tickets").send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("rejects an empty summary with a field-level message (API-02)", async () => {
    const res = await agent.post("/api/tickets").send({ ...validPayload(), summary: "" });
    expect(res.status).toBe(400);
    expect(res.body.fields.summary).toBeDefined();
  });

  it("rejects requests with no authenticated session", async () => {
    const res = await request(app).post("/api/tickets").send(validPayload());
    expect(res.status).toBe(401);
  });

  it("rejects a non-existent categoryId", async () => {
    const res = await agent.post("/api/tickets").send({ ...validPayload(), categoryId: 999999 });
    expect(res.status).toBe(404);
  });
});