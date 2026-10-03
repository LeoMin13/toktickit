import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let categoryId: number;
let relatedSystemId: number;

async function createTicket(agent: ReturnType<typeof request.agent>, summary: string) {
  return agent.post("/api/tickets").send({
    categoryId,
    relatedSystemId,
    summary,
    description: "Description long enough for validation purposes here.",
    requestedPriority: "MEDIUM",
  });
}

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
  categoryId = categories.body[0].id;
  const systems = await agentA.get("/api/related-systems");
  relatedSystemId = systems.body[0].id;

  await createTicket(agentA, "Laptop battery drains quickly");
  await createTicket(agentA, "Cannot connect to VPN");
  await createTicket(agentB, "Printer not detected");
});

describe("GET /api/tickets", () => {
  it("returns only the current requester's own tickets (API-03)", async () => {
    const resA = await agentA.get("/api/tickets");
    const resB = await agentB.get("/api/tickets");

    expect(resA.status).toBe(200);
    expect(resA.body.data.every((t: { summary: string }) => t.summary !== "Printer not detected")).toBe(true);
    expect(resB.status).toBe(200);
    expect(
      resB.body.data.every((t: { summary: string }) =>
        !["Laptop battery drains quickly", "Cannot connect to VPN"].includes(t.summary)
      )
    ).toBe(true);
  });

  it("returns an empty data array for a search term with no match (API-04)", async () => {
    const res = await agentA.get("/api/tickets?search=zzz-no-match-zzz");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("paginates results correctly (API-05)", async () => {
    const res = await agentA.get("/api/tickets?page=1&pageSize=10");
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  it("rejects an invalid pageSize with 400", async () => {
    const res = await agentA.get("/api/tickets?pageSize=7");
    expect(res.status).toBe(400);
  });

  it("sorts by createdAt ascending when requested", async () => {
    const res = await agentA.get("/api/tickets?sort=createdAt&order=asc&pageSize=50");
    expect(res.status).toBe(200);
    const dates = res.body.data.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });
});