import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let relatedSystemId: number;

async function createTicket(requesterId: number, summary: string) {
  return request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", String(requesterId))
    .send({
      categoryId,
      relatedSystemId,
      summary,
      description: "Description long enough for validation purposes here.",
      requestedPriority: "MEDIUM",
    });
}

beforeAll(async () => {
  const requesters = await request(app).get("/api/requesters");
  requesterAId = requesters.body[0].id;
  requesterBId = requesters.body[1].id;
  const categories = await request(app).get("/api/categories");
  categoryId = categories.body[0].id;
  const systems = await request(app).get("/api/related-systems");
  relatedSystemId = systems.body[0].id;

  await createTicket(requesterAId, "Laptop battery drains quickly");
  await createTicket(requesterAId, "Cannot connect to VPN");
  await createTicket(requesterBId, "Printer not detected");
});

describe("GET /api/tickets", () => {
  it("returns only the current requester's own tickets (API-03)", async () => {
    const resA = await request(app).get("/api/tickets").set("X-Requester-Id", String(requesterAId));
    const resB = await request(app).get("/api/tickets").set("X-Requester-Id", String(requesterBId));

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
    const res = await request(app)
      .get("/api/tickets?search=zzz-no-match-zzz")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("paginates results correctly (API-05)", async () => {
    const res = await request(app)
      .get("/api/tickets?page=1&pageSize=10")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  it("rejects an invalid pageSize with 400", async () => {
    const res = await request(app)
      .get("/api/tickets?pageSize=7")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body.field).toBe("pageSize");
  });

  it("sorts by createdAt ascending when requested", async () => {
    const res = await request(app)
      .get("/api/tickets?sort=createdAt&order=asc&pageSize=50")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const dates = res.body.data.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });
});