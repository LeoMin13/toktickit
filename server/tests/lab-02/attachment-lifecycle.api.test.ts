import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let ticketId: number;
let attachmentId: number;

function smallPdfBuffer() {
  return Buffer.from("%PDF-1.4 lifecycle test content");
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
  const systems = await agentA.get("/api/related-systems");

  const ticketRes = await agentA.post("/api/tickets").send({
    categoryId: categories.body[0].id,
    relatedSystemId: systems.body[0].id,
    summary: "Ticket for attachment lifecycle tests",
    description: "This ticket exists to test add, download, and removal of attachments.",
    requestedPriority: "LOW",
  });
  ticketId = ticketRes.body.id;

  const attachRes = await agentA
    .post(`/api/tickets/${ticketId}/attachments`)
    .attach("file", smallPdfBuffer(), { filename: "doc.pdf", contentType: "application/pdf" });
  attachmentId = attachRes.body.id;
});

describe("Attachment lifecycle", () => {
  it("downloads an active attachment successfully", async () => {
    const res = await agentA.get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(200);
  });

  it("soft-removes an active attachment, then blocks its download with 410 (API-09)", async () => {
    const removeRes = await agentA
      .delete(`/api/attachments/${attachmentId}`)
      .send({ reason: "Uploaded wrong file" });
    expect(removeRes.status).toBe(200);

    const downloadRes = await agentA.get(`/api/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(410);
  });

  it("rejects access to an attachment on a ticket owned by a different requester (API-10)", async () => {
    const attachRes = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", smallPdfBuffer(), { filename: "doc3.pdf", contentType: "application/pdf" });

    const downloadRes = await agentB.get(`/api/attachments/${attachRes.body.id}/download`);
    expect(downloadRes.status).toBe(404);

    const removeRes = await agentB
      .delete(`/api/attachments/${attachRes.body.id}`)
      .send({ reason: "Not my attachment" });
    expect(removeRes.status).toBe(404);
  });
});