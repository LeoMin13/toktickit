import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/categories", () => {
  it("returns the four seeded categories (Lab 1, reused)", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});

describe("GET /api/related-systems", () => {
  it("returns at least 6 active related systems, ordered by name", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const names = res.body.map((s: { name: string }) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("returns 200 with an empty array when no active related systems exist", async () => {
    vi.spyOn(getPrisma(), "relatedSystem", "get").mockReturnValue({
      findMany: vi.fn().mockResolvedValue([]),
    } as never);

    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    vi.restoreAllMocks();
  });
});