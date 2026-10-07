export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
}

export interface Attachment {
  id: number;
  ticketId: number;
  originalFileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt?: string;
  removalReason?: string;
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryId: number;
  categoryName: string;
  requestedPriority: RequestedPriority;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTickets {
  data: TicketListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: string;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorRole: "REQUESTER" | "IT_STAFF" | "ADMIN";
}

export interface StaffTicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryId: number;
  categoryName: string;
  requestedPriority: RequestedPriority;
  currentStatus: string;
  ticketOwnerId: number | null;
  ticketOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedStaffTickets {
  data: StaffTicketListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface StaffTicketListQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: string;
  ownerId?: string;
  sort?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Note {
  id: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  requesterName: string;
  categoryId: number;
  categoryName: string;
  relatedSystemId: number;
  relatedSystemName: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: string;
  problemAppearsResolved: boolean;
  ticketOwnerId: number | null;
  ticketOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  comments: Comment[];
  notes: Note[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMIN";
  isActive: boolean;
}