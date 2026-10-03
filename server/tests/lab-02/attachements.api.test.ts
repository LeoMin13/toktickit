import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agent: ReturnType<typeof request.agent>;
let ticketId: number;

beforeAll(async () => {
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({
    email: "jennifer.anderson@example.com",
    password: "Requester123!",
  });
  const categories = await agent.get("/api/categories");
  const systems = await agent.get("/api/related-systems");

  const ticketRes = await agent.post("/api/tickets").send({
    categoryId: categories.body[0].id,
    relatedSystemId: systems.body[0].id,
    summary: "Ticket for attachment tests",
    description: "This ticket exists purely to attach files to during testing.",
    requestedPriority: "LOW",
  });
  ticketId = ticketRes.body.id;
});

function smallPdfBuffer() {
  return Buffer.from("%PDF-1.4 test content");
}

describe("POST /api/tickets/:id/attachments", () => {
  it("rejects a file over 5 MB with 413 (API-07)", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, "a");
    const res = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", bigBuffer, { filename: "big.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(413);
  });

  it("rejects a 6th active attachment on the same ticket with 409 (API-08)", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await agent
        .post(`/api/tickets/${ticketId}/attachments`)
        .attach("file", smallPdfBuffer(), { filename: `doc-${i}.pdf`, contentType: "application/pdf" });
      expect(res.status).toBe(201);
    }
    const sixth = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", smallPdfBuffer(), { filename: "doc-6.pdf", contentType: "application/pdf" });
    expect(sixth.status).toBe(409);
  });
});