import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/requesters", () => {
  it("returns only active requesters from the seeded database, ordered by name", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).not.toContain("Former Employee"); // inactive, must be excluded

    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  // API-11: empty-list case, mocked so we don't depend on wiping the real DB
  it("returns 200 with an empty array when no active requesters exist", async () => {
    vi.spyOn(getPrisma(), "requesterUser", "get").mockReturnValue({
      findMany: vi.fn().mockResolvedValue([]),
    } as never);

    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    vi.restoreAllMocks();
  });
});