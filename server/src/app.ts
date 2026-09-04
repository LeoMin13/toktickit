import type { NextFunction } from "express";
import { generateTicketNumber } from "./services/ticketNumber.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import fs from "node:fs";
import { upload } from "./middleware/upload.js";
import multer from "multer";


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

async function requireOwnedTicket(req: Request, res: Response, next: NextFunction) {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.requesterId !== res.locals.requesterId) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.locals.ticket = ticket;
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

app.post(
  "/api/tickets/:id/attachments",
  requireRequester,
  requireOwnedTicket,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File exceeds 5 MB limit" });
        }
        if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
          return res.status(400).json({ error: "Unsupported file type" });
        }
        return res.status(500).json({ error: "Upload failed" });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const ticketId = Number(req.params.id);
    const prisma = getPrisma();

    const activeCount = await prisma.attachment.count({
      where: { ticketId, isRemoved: false },
    });

    if (activeCount >= 5) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ error: "Maximum of 5 active attachments reached" });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    res.status(201).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalFileName: attachment.originalFileName,
      sizeBytes: attachment.sizeBytes,
      mimeType: attachment.mimeType,
      uploadedAt: attachment.uploadedAt,
      isRemoved: attachment.isRemoved,
    });
  }
);

const SORTABLE_FIELDS = new Set(["createdAt", "updatedAt"]);
const PAGE_SIZES = new Set([10, 25, 50]);

app.get("/api/tickets", requireRequester, async (req: Request, res: Response) => {
  const {
    search,
    categoryId,
    requestedPriority,
    currentStatus,
    sort = "createdAt",
    order = "desc",
    page = "1",
    pageSize = "10",
  } = req.query as Record<string, string>;

  const pageNum = Number(page);
  const pageSizeNum = Number(pageSize);

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return res.status(400).json({ error: "Invalid query parameter", field: "page" });
  }
  if (!PAGE_SIZES.has(pageSizeNum)) {
    return res.status(400).json({ error: "Invalid query parameter", field: "pageSize" });
  }
  if (!SORTABLE_FIELDS.has(sort)) {
    return res.status(400).json({ error: "Invalid query parameter", field: "sort" });
  }
  if (order !== "asc" && order !== "desc") {
    return res.status(400).json({ error: "Invalid query parameter", field: "order" });
  }

  const where: Record<string, unknown> = { requesterId: res.locals.requesterId };

  if (search) {
    where.OR = [
      { summary: { contains: search, mode: "insensitive" } },
      { ticketNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = Number(categoryId);
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (currentStatus) where.currentStatus = currentStatus;

  const prisma = getPrisma();

  try {
    const [data, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        include: { category: { select: { name: true } } },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.status(200).json({
      data: data.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        categoryId: t.categoryId,
        categoryName: t.category.name,
        requestedPriority: t.requestedPriority,
        currentStatus: t.currentStatus,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSizeNum)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to load tickets" });
  }
});



export default app;