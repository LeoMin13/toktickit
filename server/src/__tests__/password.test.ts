import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../services/password.js";

describe("password hashing", () => {
  it("never stores the plaintext password as the hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toBe("Sup3rSecret!");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(await verifyPassword("Sup3rSecret!", hash)).toBe(true);
  });

  it("rejects an incorrect password against the hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(await verifyPassword("WrongPassword!", hash)).toBe(false);
  });
});