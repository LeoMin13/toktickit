import session from "express-session";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";

export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}