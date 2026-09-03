import type { PrismaClient } from "@prisma/client";

const TICKET_NUMBER_REGEX = /^TKT-\d{4}-\d{6}$/;

export async function generateTicketNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  const count = await prisma.ticket.count({
    where: { ticketNumber: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(6, "0");
  return `${prefix}${sequence}`;
}

export function isValidTicketNumber(value: string): boolean {
  return TICKET_NUMBER_REGEX.test(value);
}