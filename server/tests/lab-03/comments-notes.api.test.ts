import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let ticketId: number;

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
    summary: "Ticket for comments and resolved tests",
    description: "This ticket exists to test public comments and the resolved flag.",
    requestedPriority: "LOW",
  });
  ticketId = ticketRes.body.id;
});

describe("Public Comments", () => {
  it("posts and retrieves a comment with author info", async () => {
    const postRes = await agentA.post(`/api/tickets/${ticketId}/comments`).send({
      content: "Still happening after the update.",
    });
    expect(postRes.status).toBe(201);
    expect(postRes.body.authorName).toBe("Jennifer Anderson");

    const listRes = await agentA.get(`/api/tickets/${ticketId}/comments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects an empty comment (API-12)", async () => {
    const res = await agentA.post(`/api/tickets/${ticketId}/comments`).send({ content: "   " });
    expect(res.status).toBe(400);
    expect(res.body.fields.content).toBeDefined();
  });

  it("rejects access to comments on a ticket owned by a different requester", async () => {
    const res = await agentB.get(`/api/tickets/${ticketId}/comments`);
    expect(res.status).toBe(404);
  });
});

describe("Problem Appears Resolved", () => {
  it("sets the flag without changing the ticket status (API-13)", async () => {
    const res = await agentA.patch(`/api/tickets/${ticketId}/resolved`);
    expect(res.status).toBe(200);
    expect(res.body.problemAppearsResolved).toBe(true);

    const ticketRes = await agentA.get(`/api/tickets/${ticketId}`);
    expect(ticketRes.body.currentStatus).toBe("NEW");
  });

  it("rejects marking resolved on a ticket owned by a different requester", async () => {
    const res = await agentB.patch(`/api/tickets/${ticketId}/resolved`);
    expect(res.status).toBe(404);
  });
});

describe("Internal Notes — role restrictions (API-06)", () => {
  it("allows IT Staff to post and read notes", async () => {
    const staffAgent = request.agent(app);
    await staffAgent.post("/api/auth/login").send({
      email: "alex.thompson@tiktockit.com", password: "Staff123!",
    });

    const postRes = await staffAgent.post(`/api/tickets/${ticketId}/notes`).send({
      content: "Checked the device, battery health at 62%.",
    });
    expect(postRes.status).toBe(201);

    const listRes = await staffAgent.get(`/api/tickets/${ticketId}/notes`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a Requester posting a note, with no content leaked (403)", async () => {
    const res = await agentA.post(`/api/tickets/${ticketId}/notes`).send({
      content: "Should not be allowed.",
    });
    expect(res.status).toBe(403);
    expect(res.body.content).toBeUndefined();
  });

  it("rejects a Requester reading notes (403)", async () => {
    const res = await agentA.get(`/api/tickets/${ticketId}/notes`);
    expect(res.status).toBe(403);
    expect(Array.isArray(res.body)).toBe(false);
  });

  it("allows IT Staff to post and read public comments on any ticket", async () => {
    const staffAgent = request.agent(app);
    await staffAgent.post("/api/auth/login").send({
        email: "alex.thompson@tiktockit.com", password: "Staff123!",
    });

    const postRes = await staffAgent.post(`/api/tickets/${ticketId}/comments`).send({
        content: "We're looking into this now.",
    });
    expect(postRes.status).toBe(201);

    const listRes = await staffAgent.get(`/api/tickets/${ticketId}/comments`);
    expect(listRes.status).toBe(200);
  });
});