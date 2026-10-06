import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let staffAgent: ReturnType<typeof request.agent>;
let staff2Agent: ReturnType<typeof request.agent>;
let requesterAgent: ReturnType<typeof request.agent>;
let ticketId: number;
let staff2Id: number;

beforeAll(async () => {
  staffAgent = request.agent(app);
  await staffAgent.post("/api/auth/login").send({
    email: "alex.thompson@tiktockit.com", password: "Staff123!",
  });
  staff2Agent = request.agent(app);
  await staff2Agent.post("/api/auth/login").send({
    email: "priya.patel@tiktockit.com", password: "Staff123!",
  });
  requesterAgent = request.agent(app);
  await requesterAgent.post("/api/auth/login").send({
    email: "jennifer.anderson@example.com", password: "Requester123!",
  });

  const staff2Me = await staff2Agent.get("/api/auth/me");
  staff2Id = staff2Me.body.id;

  const categories = await staffAgent.get("/api/categories");
  const systems = await staffAgent.get("/api/related-systems");
  const ticketRes = await requesterAgent.post("/api/tickets").send({
    categoryId: categories.body[0].id,
    relatedSystemId: systems.body[0].id,
    summary: "Staff detail test ticket",
    description: "This ticket exists to test IT Staff ownership, priority, and status.",
    requestedPriority: "LOW",
  });
  ticketId = ticketRes.body.id;
});

describe("Ownership (API-09)", () => {
  it("claims an unassigned ticket", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/owner`).send({
      ownerId: staff2Id,
    });
    expect(res.status).toBe(200);
    expect(res.body.ticketOwnerId).toBe(staff2Id);
  });

  it("rejects assigning to a Requester account", async () => {
    const requesterMe = await requesterAgent.get("/api/auth/me");
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/owner`).send({
      ownerId: requesterMe.body.id,
    });
    expect(res.status).toBe(400);
  });
});

describe("Status transitions (API-10)", () => {
  it("allows NEW -> OPEN", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/status`).send({
      status: "OPEN",
    });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  it("rejects OPEN -> RESOLVED (not in the matrix)", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/status`).send({
      status: "RESOLVED",
    });
    expect(res.status).toBe(400);
  });

  it("rejects status changes from a Requester (403)", async () => {
    const res = await requesterAgent.patch(`/api/staff/tickets/${ticketId}/status`).send({
      status: "IN_PROGRESS",
    });
    expect(res.status).toBe(403);
  });
});

describe("IT Priority (API-11)", () => {
  it("defaults to Requested Priority on creation", async () => {
    const res = await staffAgent.get(`/api/staff/tickets/${ticketId}`);
    expect(res.body.itPriority).toBe("LOW");
  });

  it("can be changed by IT Staff", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/priority`).send({
      itPriority: "HIGH",
    });
    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("HIGH");
  });
});