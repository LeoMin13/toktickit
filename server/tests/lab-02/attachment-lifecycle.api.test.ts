import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let requesterAId: number;
let requesterBId: number;
let ticketId: number;
let attachmentId: number;

function smallPdfBuffer() {
  return Buffer.from("%PDF-1.4 lifecycle test content");
}

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
      summary: "Ticket for attachment lifecycle tests",
      description: "This ticket exists to test add, download, and removal of attachments.",
      requestedPriority: "LOW",
    });
  ticketId = ticketRes.body.id;

  const attachRes = await request(app)
    .post(`/api/tickets/${ticketId}/attachments`)
    .set("X-Requester-Id", String(requesterAId))
    .attach("file", smallPdfBuffer(), { filename: "doc.pdf", contentType: "application/pdf" });
  attachmentId = attachRes.body.id;
});

describe("Attachment lifecycle", () => {
  it("downloads an active attachment successfully", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
  });

  it("soft-removes an active attachment, then blocks its download with 410 (API-09)", async () => {
    const removeRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "Uploaded wrong file" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
    expect(removeRes.body.removalReason).toBe("Uploaded wrong file");

    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requesterAId));

    expect(downloadRes.status).toBe(410);
  });

  it("rejects removal with a reason under 3 characters", async () => {
    const attachRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", smallPdfBuffer(), { filename: "doc2.pdf", contentType: "application/pdf" });

    const res = await request(app)
      .delete(`/api/attachments/${attachRes.body.id}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "no" });

    expect(res.status).toBe(400);
    expect(res.body.fields.reason).toBeDefined();
  });

  it("rejects removing an already-removed attachment with 409", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requesterAId))
      .send({ reason: "Trying again" });

    expect(res.status).toBe(409);
  });

  it("rejects access to an attachment on a ticket owned by a different requester (API-10)", async () => {
    const attachRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requesterAId))
      .attach("file", smallPdfBuffer(), { filename: "doc3.pdf", contentType: "application/pdf" });

    const downloadRes = await request(app)
      .get(`/api/attachments/${attachRes.body.id}/download`)
      .set("X-Requester-Id", String(requesterBId));
    expect(downloadRes.status).toBe(404);

    const removeRes = await request(app)
      .delete(`/api/attachments/${attachRes.body.id}`)
      .set("X-Requester-Id", String(requesterBId))
      .send({ reason: "Not my attachment" });
    expect(removeRes.status).toBe(404);
  });
});