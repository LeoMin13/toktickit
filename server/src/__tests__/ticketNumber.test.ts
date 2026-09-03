import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { generateTicketNumber, isValidTicketNumber } from "../services/ticketNumber.js";

function mockPrisma(count: number) {
  return {
    ticket: { count: vi.fn().mockResolvedValue(count) },
  } as unknown as PrismaClient;
}

describe("generateTicketNumber", () => {
  it("produces a TKT-<year>-<6 digits> formatted number", async () => {
    const number = await generateTicketNumber(mockPrisma(0));
    expect(isValidTicketNumber(number)).toBe(true);
    expect(number).toContain(String(new Date().getFullYear()));
    expect(number.endsWith("000001")).toBe(true);
  });

  it("increments the sequence based on the existing count for the year", async () => {
    const number = await generateTicketNumber(mockPrisma(41));
    expect(number.endsWith("000042")).toBe(true);
  });
});