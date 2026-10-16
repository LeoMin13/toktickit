import type { APIRequestContext, Playwright } from "@playwright/test";

const API = "http://localhost:3000";

export async function apiLogin(
  playwright: Playwright,
  email: string,
  password: string
): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL: API });
  const res = await ctx.post("/api/auth/login", { data: { email, password } });
  if (!res.ok()) throw new Error(`API login failed for ${email}: ${res.status()}`);
  return ctx;
}

export async function createTicketViaApi(
  ctx: APIRequestContext,
  summary: string
): Promise<{ id: number; ticketNumber: string }> {
  const categories = await (await ctx.get("/api/categories")).json();
  const systems = await (await ctx.get("/api/related-systems")).json();
  const res = await ctx.post("/api/tickets", {
    data: {
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary,
      description: "Ticket created by an end-to-end test through the API.",
      requestedPriority: "LOW",
    },
  });
  if (res.status() !== 201) throw new Error(`Ticket creation failed: ${res.status()}`);
  return res.json();
}