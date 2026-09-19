import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";

/**
 * Must run AFTER requireAuth (which sets res.locals.currentUser).
 * Returns 401 if somehow no authenticated user is present, 403 if the
 * authenticated user's role is not in the allowed list.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.currentUser;

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}