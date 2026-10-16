import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { requireRole } from "../../src/middleware/authorization.js";
import request from "supertest";
import { app } from "../../src/app.js";


function mockRes(currentUser: { role: string } | null) {
  return {
    locals: { currentUser },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("requireRole middleware", () => {
  it("calls next() when the current user's role is allowed", () => {
    const res = mockRes({ role: "IT_STAFF" });
    const next = vi.fn();

    requireRole("IT_STAFF", "ADMIN")({} as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when the current user's role is not allowed", () => {
    const res = mockRes({ role: "REQUESTER" });
    const next = vi.fn();

    requireRole("IT_STAFF", "ADMIN")({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("returns 401 when no authenticated user is present at all", () => {
    const res = mockRes(null);
    const next = vi.fn();

    requireRole("ADMIN")({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("accepts a single-role restriction (e.g. ADMIN only)", () => {
    const res = mockRes({ role: "ADMIN" });
    const next = vi.fn();

    requireRole("ADMIN")({} as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects IT_STAFF from an ADMIN-only route", () => {
    const res = mockRes({ role: "IT_STAFF" });
    const next = vi.fn();

    requireRole("ADMIN")({} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});


describe("Requester identity comes from the session (API-05 / AC-03)", () => {
  it("ignores a client-supplied requesterId when creating a ticket", async () => {
    const jennifer = request.agent(app);
    await jennifer.post("/api/auth/login").send({
      email: "jennifer.anderson@example.com", password: "Requester123!",
    });
    const michael = request.agent(app);
    await michael.post("/api/auth/login").send({
      email: "michael.brown@example.com", password: "Requester123!",
    });

    const jenniferId = (await jennifer.get("/api/auth/me")).body.id;
    const michaelId = (await michael.get("/api/auth/me")).body.id;
    const categories = await jennifer.get("/api/categories");
    const systems = await jennifer.get("/api/related-systems");

    const res = await jennifer.post("/api/tickets").send({
      requesterId: michaelId, // spoofing attempt
      categoryId: categories.body[0].id,
      relatedSystemId: systems.body[0].id,
      summary: "Spoofed requester id attempt",
      description: "The backend must ignore the requesterId sent by the client.",
      requestedPriority: "LOW",
    });

    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe(jenniferId);

    const michaelList = await michael
      .get("/api/tickets")
      .query({ search: "Spoofed requester id attempt" });
    expect(michaelList.body.data).toHaveLength(0);
  });
});