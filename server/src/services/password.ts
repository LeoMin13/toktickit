import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateRandomPassword(): string {
  // Used only for migrating existing Lab 2 Requesters: nobody should be
  // able to log in with this value; a real password is set later via
  // Admin or seed.
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}