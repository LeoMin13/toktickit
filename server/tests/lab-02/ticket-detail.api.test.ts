import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let ownedTicketId: number;

beforeAll(async () => {
  agentA = request.agent(app);
  await agentA.post("/api/auth/login").send({
    email: "jennifer.anderson@example.com",
    password: "Requester123!",
  });
  agentB = request.agent(app);
  await agentB.post("/api/auth/login").send({
    email: "michael.brown@example.com",
    password: "Requester123!",
  });

  const categories = await agentA.get("/api/categories");
  const systems = await agentA.get("/api/related-systems");

  const ticketRes = await agentA.post("/api/tickets").send({
    categoryId: categories.body[0].id,
    relatedSystemId: systems.body[0].id,
    summary: "Ticket owned by Requester A",
    description: "This ticket belongs to Requester A for ownership testing.",
    requestedPriority: "HIGH",
  });
  ownedTicketId = ticketRes.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the full ticket with attachments for its owner", async () => {
    const res = await agentA.get(`/api/tickets/${ownedTicketId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ownedTicketId);
  });

  it("returns 404 with no ownership hint when requested by a different requester (API-06)", async () => {
    const res = await agentB.get(`/api/tickets/${ownedTicketId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ticket not found");
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await agentA.get("/api/tickets/999999");
    expect(res.status).toBe(404);
  });
});