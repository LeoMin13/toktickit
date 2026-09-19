import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { requireRole } from "../../src/middleware/authorization.js";

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