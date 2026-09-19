import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 → Lab 3 migration integrity", () => {
  it("every existing ticket's requester resolves to a valid, existing User", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({ select: { id: true, requesterId: true } });

    for (const ticket of tickets) {
      const user = await prisma.user.findUnique({ where: { id: ticket.requesterId } });
      expect(user).not.toBeNull();
    }
  });

  it("seeded requester accounts have hashed passwords, never plaintext", async () => {
    const prisma = getPrisma();
    const requester = await prisma.user.findFirst({ where: { role: "REQUESTER" } });
    expect(requester?.passwordHash).toBeDefined();
    expect(requester?.passwordHash).not.toBe("Requester123!");
  });

  it("seed produces the minimum required accounts per role", async () => {
    const prisma = getPrisma();
    const activeRequesters = await prisma.user.count({ where: { role: "REQUESTER", isActive: true } });
    const activeStaff = await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } });
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });

    expect(activeRequesters).toBeGreaterThanOrEqual(4);
    expect(activeStaff).toBeGreaterThanOrEqual(3);
    expect(activeAdmins).toBeGreaterThanOrEqual(1);
  });
});
