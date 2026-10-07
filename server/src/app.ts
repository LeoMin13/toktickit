import type { NextFunction } from "express";
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { getPrisma } from "./prisma.js";
import { generateUniqueTicketNumber } from "./services/ticketNumber.js";
import { upload } from "./middleware/upload.js";
import { sessionMiddleware } from "./middleware/session.js";
import { hashPassword, verifyPassword } from "./services/password.js";
import { requireRole } from "./middleware/authorization.js";
import { isTransitionAllowed } from "./services/statusTransitions.js";



// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
}));
app.use(express.json());
app.use(sessionMiddleware);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

async function requireOwnedTicket(req: Request, res: Response, next: NextFunction) {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.requesterId !== res.locals.currentUser.id) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.locals.ticket = ticket;
  next();
}

async function requireStaffTicket(req: Request, res: Response, next: NextFunction) {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.locals.ticket = ticket;
  next();
}

async function requireOwnedAttachment(req: Request, res: Response, next: NextFunction) {
  const attachmentId = Number(req.params.id);
  if (!Number.isInteger(attachmentId)) {
    return res.status(404).json({ error: "Attachment not found" });
  }

  const attachment = await getPrisma().attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  });

  if (!attachment || attachment.ticket.requesterId !== res.locals.currentUser.id) {
    return res.status(404).json({ error: "Attachment not found" });
  }

  res.locals.attachment = attachment;
  next();
}

// Lab 3: real authentication middleware, based on the session, not a header.
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await getPrisma().user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.locals.currentUser = user;
  next();
}

function requireNoPendingPasswordChange(req: Request, res: Response, next: NextFunction) {
  const user = res.locals.currentUser;
  if (user.mustChangePassword) {
    return res.status(403).json({ error: "Password change required" });
  }
  next();
}

// ---------------------------------------------------------------------------
// Health / reference data (Lab 1 & 2)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Authentication (Lab 3, Issue 3)
// ---------------------------------------------------------------------------

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  req.session.userId = user.id;
  res.status(200).json({
    id: user.id,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.status(200).json({});
  });
});

app.get("/api/auth/me", requireAuth, (_req: Request, res: Response) => {
  const user = res.locals.currentUser;
  res.status(200).json({
    id: user.id,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

app.post("/api/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = res.locals.currentUser;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Validation failed" });
  }

  const validCurrent = await verifyPassword(currentPassword, user.passwordHash);
  if (!validCurrent) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    return res.status(400).json({
      error: "Validation failed",
      fields: { newPassword: "Password does not meet the required rules." },
    });
  }

  const newHash = await hashPassword(newPassword);
  await getPrisma().user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  res.status(200).json({ mustChangePassword: false });
});

// ---------------------------------------------------------------------------
// Ticket creation (Lab 2, now authenticated via session — Issue 5)
// ---------------------------------------------------------------------------

app.post("/api/tickets", requireAuth, requireRole("REQUESTER"), async (req: Request, res: Response) => {
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
    const ticketNumber = await generateUniqueTicketNumber(prisma);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: res.locals.currentUser.id,
        categoryId,
        relatedSystemId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
        itPriority: requestedPriority, // BR-07: defaults to Requested Priority
      },
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Unable to create ticket" });
  }
});

// ---------------------------------------------------------------------------
// Attachments (Lab 2, now authenticated via session — Issue 5)
// ---------------------------------------------------------------------------

app.post(
  "/api/tickets/:id/attachments",
  requireAuth,
  requireRole("REQUESTER"),
  requireOwnedTicket,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        req.resume(); // drain the remaining stream to avoid client-side ECONNRESET
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

app.get(
  "/api/attachments/:id/download",
  requireAuth,
  requireRole("REQUESTER"),
  requireOwnedAttachment,
  (_req: Request, res: Response) => {
    const attachment = res.locals.attachment;

    if (attachment.isRemoved) {
      return res.status(410).json({ error: "This attachment has been removed" });
    }

    const filePath = path.join(process.cwd(), "uploads", attachment.storedFileName);
    res.download(filePath, attachment.originalFileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Unable to download attachment" });
      }
    });
  }
);

app.delete(
  "/api/attachments/:id",
  requireAuth,
  requireRole("REQUESTER"),
  requireOwnedAttachment,
  async (req: Request, res: Response) => {
    const attachment = res.locals.attachment;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (reason.length < 3) {
      return res.status(400).json({
        error: "Validation failed",
        fields: { reason: "Reason must be at least 3 characters" },
      });
    }

    if (attachment.isRemoved) {
      return res.status(409).json({ error: "Attachment already removed" });
    }

    const updated = await getPrisma().attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedAt: new Date(), removalReason: reason },
    });

    res.status(200).json({
      id: updated.id,
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt,
      removalReason: updated.removalReason,
    });
  }
);

// ---------------------------------------------------------------------------
// My Tickets (Lab 2, now authenticated via session — Issue 5)
// ---------------------------------------------------------------------------

const SORTABLE_FIELDS = new Set(["createdAt", "updatedAt"]);
const PAGE_SIZES = new Set([10, 25, 50]);

app.get("/api/tickets", requireAuth, requireRole("REQUESTER"), async (req: Request, res: Response) => {
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

  const where: Record<string, unknown> = { requesterId: res.locals.currentUser.id };

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

app.get("/api/tickets/:id", requireAuth, requireRole("REQUESTER"), async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { name: true } },
        relatedSystem: { select: { name: true } },
        attachments: {
          select: {
            id: true,
            originalFileName: true,
            sizeBytes: true,
            mimeType: true,
            uploadedAt: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
          },
        },
      },
    });

    if (!ticket || ticket.requesterId !== res.locals.currentUser.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      requesterId: ticket.requesterId,
      categoryId: ticket.categoryId,
      categoryName: ticket.category.name,
      relatedSystemId: ticket.relatedSystemId,
      relatedSystemName: ticket.relatedSystem.name,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      currentStatus: ticket.currentStatus,
      problemAppearsResolved: ticket.problemAppearsResolved,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      attachments: ticket.attachments,
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to load ticket" });
  }
});

app.post(
  "/api/tickets/:id/comments",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const role = res.locals.currentUser.role;
    if (role === "REQUESTER") return requireOwnedTicket(req, res, next);
    if (role === "IT_STAFF" || role === "ADMIN") return requireStaffTicket(req, res, next);
    return res.status(403).json({ error: "Forbidden" });
  },
  async (req: Request, res: Response) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (content.length === 0) {
      return res.status(400).json({
        error: "Validation failed",
        fields: { content: "Comment cannot be empty" },
      });
    }

    const comment = await getPrisma().publicComment.create({
      data: {
        ticketId: Number(req.params.id),
        authorId: res.locals.currentUser.id,
        content,
      },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      authorName: comment.author.name,
      authorRole: comment.author.role,
    });
  }
);

app.get(
  "/api/tickets/:id/comments",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const role = res.locals.currentUser.role;
    if (role === "REQUESTER") return requireOwnedTicket(req, res, next);
    if (role === "IT_STAFF" || role === "ADMIN") return requireStaffTicket(req, res, next);
    return res.status(403).json({ error: "Forbidden" });
  },
  async (req: Request, res: Response) => {
    const comments = await getPrisma().publicComment.findMany({
      where: { ticketId: Number(req.params.id) },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(200).json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        authorName: c.author.name,
        authorRole: c.author.role,
      }))
    );
  }
);

app.patch(
  "/api/tickets/:id/resolved",
  requireAuth,
  requireRole("REQUESTER"),
  requireOwnedTicket,
  async (req: Request, res: Response) => {
    const updated = await getPrisma().ticket.update({
      where: { id: Number(req.params.id) },
      data: { problemAppearsResolved: true },
    });
    res.status(200).json({ problemAppearsResolved: updated.problemAppearsResolved });
  }
);

app.get(
  "/api/staff/tickets",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const {
      search,
      categoryId,
      requestedPriority,
      itPriority,
      currentStatus,
      ownerId,
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

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { summary: { contains: search, mode: "insensitive" } },
        { ticketNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = Number(categoryId);
    if (requestedPriority) where.requestedPriority = requestedPriority;
    if (currentStatus) where.currentStatus = currentStatus;
    if (ownerId === "unassigned") {
      where.ticketOwnerId = null;
    } else if (ownerId) {
      where.ticketOwnerId = Number(ownerId);
    }

    const prisma = getPrisma();

    try {
      const [data, totalItems] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy: { [sort]: order },
          skip: (pageNum - 1) * pageSizeNum,
          take: pageSizeNum,
          include: {
            category: { select: { name: true } },
            ticketOwner: { select: { id: true, name: true } },
          },
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
          ticketOwnerId: t.ticketOwnerId,
          ticketOwnerName: t.ticketOwner?.name ?? null,
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
  }
);

app.get(
  "/api/staff/tickets/:id",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (_req: Request, res: Response) => {
    const ticketId = res.locals.ticket.id;
    const prisma = getPrisma();

    const [ticket, comments, notes] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: { select: { name: true } },
          relatedSystem: { select: { name: true } },
          requester: { select: { name: true } },
          ticketOwner: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true, originalFileName: true, sizeBytes: true, mimeType: true,
              uploadedAt: true, isRemoved: true, removedAt: true, removalReason: true,
            },
          },
        },
      }),
      prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      }),
      prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      }),
    ]);

    res.status(200).json({
      id: ticket!.id,
      ticketNumber: ticket!.ticketNumber,
      requesterName: ticket!.requester.name,
      categoryId: ticket!.categoryId,
      categoryName: ticket!.category.name,
      relatedSystemId: ticket!.relatedSystemId,
      relatedSystemName: ticket!.relatedSystem.name,
      summary: ticket!.summary,
      description: ticket!.description,
      requestedPriority: ticket!.requestedPriority,
      itPriority: ticket!.itPriority,
      currentStatus: ticket!.currentStatus,
      problemAppearsResolved: ticket!.problemAppearsResolved,
      ticketOwnerId: ticket!.ticketOwnerId,
      ticketOwnerName: ticket!.ticketOwner?.name ?? null,
      createdAt: ticket!.createdAt,
      updatedAt: ticket!.updatedAt,
      attachments: ticket!.attachments,
      comments: comments.map((c) => ({
        id: c.id, content: c.content, createdAt: c.createdAt,
        authorName: c.author.name, authorRole: c.author.role,
      })),
      notes: notes.map((n) => ({
        id: n.id, content: n.content, createdAt: n.createdAt,
        authorName: n.author.name, authorRole: n.author.role,
      })),
    });
  }
);

app.patch(
  "/api/staff/tickets/:id/owner",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (req: Request, res: Response) => {
    const { ownerId } = req.body ?? {};

    if (ownerId !== null && ownerId !== undefined) {
      const owner = await getPrisma().user.findUnique({ where: { id: ownerId } });
      if (!owner || owner.isActive === false || !["IT_STAFF", "ADMIN"].includes(owner.role)) {
        return res.status(400).json({ error: "ownerId must be an active IT Staff or Admin user" });
      }
    }

    const updated = await getPrisma().ticket.update({
      where: { id: res.locals.ticket.id },
      data: { ticketOwnerId: ownerId ?? null },
      include: { ticketOwner: { select: { id: true, name: true } } },
    });

    res.status(200).json({
      ticketOwnerId: updated.ticketOwnerId,
      ticketOwnerName: updated.ticketOwner?.name ?? null,
    });
  }
);

app.patch(
  "/api/staff/tickets/:id/priority",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (req: Request, res: Response) => {
    const { itPriority } = req.body ?? {};
    if (!["LOW", "MEDIUM", "HIGH"].includes(itPriority)) {
      return res.status(400).json({ error: "itPriority must be LOW, MEDIUM, or HIGH" });
    }

    const updated = await getPrisma().ticket.update({
      where: { id: res.locals.ticket.id },
      data: { itPriority },
    });

    res.status(200).json({ itPriority: updated.itPriority });
  }
);

app.patch(
  "/api/staff/tickets/:id/status",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (req: Request, res: Response) => {
    const { status } = req.body ?? {};
    const currentStatus = res.locals.ticket.currentStatus;

    if (!isTransitionAllowed(currentStatus, status)) {
      return res.status(400).json({
        error: `Transition from ${currentStatus} to ${status} is not permitted`,
      });
    }

    const updated = await getPrisma().ticket.update({
      where: { id: res.locals.ticket.id },
      data: { currentStatus: status },
    });

    res.status(200).json({ currentStatus: updated.currentStatus });
  }
);

app.post(
  "/api/tickets/:id/notes",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (req: Request, res: Response) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (content.length === 0) {
      return res.status(400).json({
        error: "Validation failed",
        fields: { content: "Note cannot be empty" },
      });
    }

    const note = await getPrisma().internalNote.create({
      data: {
        ticketId: res.locals.ticket.id,
        authorId: res.locals.currentUser.id,
        content,
      },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(201).json({
      id: note.id, content: note.content, createdAt: note.createdAt,
      authorName: note.author.name, authorRole: note.author.role,
    });
  }
);

app.get(
  "/api/tickets/:id/notes",
  requireAuth,
  requireRole("IT_STAFF", "ADMIN"),
  requireStaffTicket,
  async (_req: Request, res: Response) => {
    const notes = await getPrisma().internalNote.findMany({
      where: { ticketId: res.locals.ticket.id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true, role: true } } },
    });
    res.status(200).json(
      notes.map((n) => ({
        id: n.id, content: n.content, createdAt: n.createdAt,
        authorName: n.author.name, authorRole: n.author.role,
      }))
    );
  }
);

app.get(
  "/api/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const { search, role } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role && ["REQUESTER", "IT_STAFF", "ADMIN"].includes(role)) {
      where.role = role;
    }

    const users = await getPrisma().user.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json(users);
  }
);

app.post(
  "/api/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const { name, email, role, isActive, initialPassword } = req.body ?? {};
    const fields: Record<string, string> = {};

    if (typeof name !== "string" || name.trim().length === 0) fields.name = "Name is required";
    if (typeof email !== "string" || email.trim().length === 0) fields.email = "Email is required";
    if (!["REQUESTER", "IT_STAFF", "ADMIN"].includes(role)) fields.role = "A valid role is required";
    if (typeof initialPassword !== "string" || initialPassword.length < 8) {
      fields.initialPassword = "Initial password must be at least 8 characters";
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: "Validation failed", fields });
    }

    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await hashPassword(initialPassword);
    const user = await getPrisma().user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        role,
        isActive: isActive ?? true,
        passwordHash,
        mustChangePassword: true,
      },
    });

    res.status(201).json({
      id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive,
    });
  }
);

app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { name, email, role, isActive } = req.body ?? {};
    const prisma = getPrisma();

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    // BR-11: an Administrator cannot deactivate their own account
    if (isActive === false && userId === res.locals.currentUser.id) {
      return res.status(400).json({ error: "You cannot deactivate your own account" });
    }

    // BR-12: never leave zero active Administrators
    if (isActive === false && target.role === "ADMIN") {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: "Cannot deactivate the last active Administrator" });
      }
    }
    if (role && role !== "ADMIN" && target.role === "ADMIN") {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) {
        return res.status(400).json({ error: "Cannot change the role of the last active Administrator" });
      }
    }

    if (email && email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: "A user with this email already exists" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({
      id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive,
    });
  }
);

app.patch(
  "/api/admin/users/:id/password",
  requireAuth,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { newPassword } = req.body ?? {};

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        error: "Validation failed",
        fields: { newPassword: "Password must be at least 8 characters" },
      });
    }

    const target = await getPrisma().user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordHash = await hashPassword(newPassword);
    await getPrisma().user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });

    res.status(200).json({ mustChangePassword: true });
  }
);

export default app;