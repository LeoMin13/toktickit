import type { NextFunction } from "express";
import { generateTicketNumber } from "./services/ticketNumber.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
// void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());


async function requireRequester(req: Request, res: Response, next: NextFunction) {
  const headerVal = req.header("X-Requester-Id");
  const requesterId = headerVal ? Number(headerVal) : NaN;

  if (!headerVal || Number.isNaN(requesterId)) {
    return res.status(401).json({ error: "Missing or invalid X-Requester-Id" });
  }

  const requester = await getPrisma().requesterUser.findUnique({ where: { id: requesterId } });
  if (!requester || !requester.isActive) {
    return res.status(401).json({ error: "Missing or invalid X-Requester-Id" });
  }

  res.locals.requesterId = requesterId;
  next();
}



app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});


app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: "Unable to load categories" });
  }
});


app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (err) {
    res.status(500).json({ error: "Unable to load requesters" });
  }
});


app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(systems);
  } catch (err) {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});


app.post("/api/tickets", requireRequester, async (req: Request, res: Response) => {
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};

  const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  const fields: Record<string, string> = {};

  if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
    fields.summary = "Summary must be between 5 and 120 characters";
  }
  if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    fields.description = "Description must be between 10 and 2000 characters";
  }
  if (!["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)) {
    fields.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH";
  }
  if (!Number.isInteger(categoryId)) {
    fields.categoryId = "Category is required";
  }
  if (!Number.isInteger(relatedSystemId)) {
    fields.relatedSystemId = "Related System is required";
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: "Validation failed", fields });
  }

  const prisma = getPrisma();
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.relatedSystem.findUnique({ where: { id: relatedSystemId } }),
  ]);

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  if (!relatedSystem || !relatedSystem.isActive) {
    return res.status(404).json({ error: "Related System not found" });
  }

  try {
    const ticketNumber = await generateTicketNumber(prisma);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: res.locals.requesterId,
        categoryId,
        relatedSystemId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
      },
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Unable to create ticket" });
  }
});


export default app;