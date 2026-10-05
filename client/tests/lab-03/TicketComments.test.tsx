import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TicketDetail from "../../src/pages/TicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const baseTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  requesterId: 1,
  categoryId: 1,
  categoryName: "Hardware",
  relatedSystemId: 1,
  relatedSystemName: "Corporate Laptop",
  summary: "Laptop battery drains quickly",
  description: "Long description here.",
  requestedPriority: "MEDIUM" as const,
  currentStatus: "NEW",
  problemAppearsResolved: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attachments: [],
};

function renderAt(path: string) {
  vi.spyOn(api, "fetchMe").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
  });
  window.history.pushState({}, "", path);
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("TicketDetail — Public Comments & Resolved", () => {
  it("posts a new comment and displays it in the thread", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(baseTicket as never);
    vi.spyOn(api, "fetchComments").mockResolvedValue([]);
    vi.spyOn(api, "postComment").mockResolvedValue({
      id: 1, content: "Still happening.", createdAt: new Date().toISOString(),
      authorName: "Jennifer Anderson", authorRole: "REQUESTER",
    });

    renderAt("/tickets/1");
    await waitFor(() => screen.getByText("No comments yet."));

    fireEvent.change(screen.getByPlaceholderText(/Add a public comment/i), {
      target: { value: "Still happening." },
    });
    fireEvent.click(screen.getByText("Post"));

    await waitFor(() => {
      expect(screen.getByText("Still happening.")).toBeInTheDocument();
    });
  });

  it("marks the problem as resolved without changing the status badge", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(baseTicket as never);
    vi.spyOn(api, "fetchComments").mockResolvedValue([]);
    vi.spyOn(api, "markProblemResolved").mockResolvedValue(undefined);

    renderAt("/tickets/1");
    await waitFor(() => screen.getByText("Mark problem as resolved"));
    fireEvent.click(screen.getByText("Mark problem as resolved"));

    await waitFor(() => {
      expect(screen.getByText(/flagged this as resolved/i)).toBeInTheDocument();
    });
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });
});