import type { Requester, RelatedSystem } from "./types.js";
import type { CreateTicketInput, Ticket } from "./types.js";
import type { Attachment } from "./types.js";
import type { PaginatedTickets, TicketListQuery } from "./types.js";
// import type { Ticket, Attachment } from "./types.js";
import type { Comment } from "./types.js";
import type { PaginatedStaffTickets, StaffTicketListQuery } from "./types.js";
import type { StaffTicketDetail, Note } from "./types.js";
import type { AdminUser } from "./types.js";


const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) throw new Error("Backend unavailable");

  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) throw new Error("Unable to load categories");
  const categories: Category[] = await catRes.json();

  return { online: true, categories };
}


export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Unable to load categories");
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) throw new Error("Unable to load related systems");
  return res.json();
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error ?? "Unable to create ticket") as Error & {
      fields?: Record<string, string>;
    };
    err.fields = body.fields;
    throw err;
  }

  return res.json();
}

export async function uploadAttachment(
  ticketId: number,
  file: File
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    credentials: "include",
    headers: {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to upload attachment");
  }
  return res.json();
}

export async function fetchTickets(
  query: TicketListQuery
): Promise<PaginatedTickets> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.requestedPriority) params.set("requestedPriority", query.requestedPriority);
  if (query.currentStatus) params.set("currentStatus", query.currentStatus);
  params.set("sort", query.sort ?? "createdAt");
  params.set("order", query.order ?? "desc");
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));

  const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`, {
    credentials: "include",
    headers: {},
  });

  if (!res.ok) throw new Error("Unable to load tickets");
  return res.json();
}

export interface TicketDetail extends Ticket {
  categoryName: string;
  relatedSystemName: string;
  attachments: Attachment[];
}

export async function fetchTicketDetail(ticketId: number): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    credentials: "include",
    headers: {},
  });
  if (res.status === 404) throw new Error("Ticket not found");
  if (!res.ok) throw new Error("Unable to load ticket");
  return res.json();
}

export async function downloadAttachment(
  attachmentId: number,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    credentials: "include",
    headers: {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to download attachment");
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `attachment-${attachmentId}`;

  const blob = await res.blob();
  return { blob, filename };
}

export async function removeAttachment(
  attachmentId: number,
  reason: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to remove attachment");
  }
}

export interface CurrentUser {
  id: number;
  name: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMIN";
  mustChangePassword: boolean;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Login failed");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function fetchMe(): Promise<CurrentUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Unable to load current user");
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error ?? "Unable to change password") as Error & {
      fields?: Record<string, string>;
    };
    err.fields = body.fields;
    throw err;
  }
}

export async function fetchComments(ticketId: number): Promise<Comment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Unable to load comments");
  return res.json();
}

export async function postComment(ticketId: number, content: string): Promise<Comment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to post comment");
  }
  return res.json();
}

export async function markProblemResolved(ticketId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolved`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Unable to update ticket");
}

export async function fetchStaffTickets(query: StaffTicketListQuery): Promise<PaginatedStaffTickets> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.requestedPriority) params.set("requestedPriority", query.requestedPriority);
  if (query.currentStatus) params.set("currentStatus", query.currentStatus);
  if (query.ownerId) params.set("ownerId", query.ownerId);
  params.set("sort", query.sort ?? "createdAt");
  params.set("order", query.order ?? "desc");
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));

  const res = await fetch(`${API_URL}/api/staff/tickets?${params.toString()}`, {
    credentials: "include",
  });

  if (res.status === 403) throw new Error("Forbidden");
  if (!res.ok) throw new Error("Unable to load tickets");
  return res.json();
}

export async function fetchStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, { credentials: "include" });
  if (res.status === 403) throw new Error("Forbidden");
  if (res.status === 404) throw new Error("Ticket not found");
  if (!res.ok) throw new Error("Unable to load ticket");
  return res.json();
}

export async function claimTicket(ticketId: number, ownerId: number | null): Promise<void> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/owner`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) throw new Error("Unable to update owner");
}

export async function setItPriority(ticketId: number, itPriority: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) throw new Error("Unable to update priority");
}

export async function setTicketStatus(ticketId: number, status: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to update status");
  }
}

export async function postNote(ticketId: number, content: string): Promise<Note> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Unable to post note");
  return res.json();
}

export async function fetchUsers(search?: string, role?: string): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  const res = await fetch(`${API_URL}/api/admin/users?${params.toString()}`, {
    credentials: "include",
  });
  if (res.status === 403) throw new Error("Forbidden");
  if (!res.ok) throw new Error("Unable to load users");
  return res.json();
}

export async function createUser(input: {
  name: string; email: string; role: string; isActive: boolean; initialPassword: string;
}): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error ?? "Unable to create user") as Error & { fields?: Record<string, string> };
    err.fields = body.fields;
    throw err;
  }
  return res.json();
}

export async function updateUser(
  id: number,
  patch: Partial<{ name: string; email: string; role: string; isActive: boolean }>
): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Unable to update user");
  }
  return res.json();
}

export async function setUserPassword(id: number, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/password`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) throw new Error("Unable to set password");
}