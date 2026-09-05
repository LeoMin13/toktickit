import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let requesterAId: number;
let requesterBId: number;
let ownedTicketId: number;

beforeAll(async () => {
  const requesters = await request(app).get("/api/requesters");
  requesterAId = requesters.body[0].id;
  requesterBId = requesters.body[1].id;
  const categories = await request(app).get("/api/categories");
  const systems = await request(app).get("/api/related-systems");

  const ticketRes = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", String(requesterAId))
    .send({
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
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ownedTicketId);
    expect(res.body.attachments).toBeInstanceOf(Array);
  });

  it("returns 404 with no ownership hint when requested by a different requester (API-06)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("X-Requester-Id", String(requesterBId));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ticket not found");
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ticket not found");
  });
});