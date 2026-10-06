import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StaffTicketDetail from "../../src/pages/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const baseTicket = {
  id: 1, ticketNumber: "TKT-2026-000001", requesterName: "Jennifer Anderson",
  categoryId: 1, categoryName: "Hardware", relatedSystemId: 1, relatedSystemName: "Corporate Laptop",
  summary: "Laptop battery drains quickly", description: "Long description.",
  requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const,
  currentStatus: "NEW", problemAppearsResolved: false,
  ticketOwnerId: null, ticketOwnerName: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  attachments: [], comments: [], notes: [],
};

function renderAt(path: string) {
  vi.spyOn(api, "fetchMe").mockResolvedValue({
    id: 2, name: "Alex Thompson", role: "IT_STAFF", mustChangePassword: false,
  });
  window.history.pushState({}, "", path);
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/queue/:id" element={<StaffTicketDetail />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("StaffTicketDetail", () => {
  it("claims an unassigned ticket and updates the owner display (UI-04)", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail")
      .mockResolvedValueOnce(baseTicket as never)
      .mockResolvedValueOnce({ ...baseTicket, ticketOwnerId: 2, ticketOwnerName: "Alex Thompson" } as never);
    const claimSpy = vi.spyOn(api, "claimTicket").mockResolvedValue(undefined);

    renderAt("/queue/1");
    await waitFor(() => screen.getByText("Claim Ticket"));
    fireEvent.click(screen.getByText("Claim Ticket"));

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith(1, 2);
    });
    await waitFor(() => {
      expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    });
  });

  it("renders Internal Notes in a visually distinct section from Public Comments (UI-05)", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseTicket,
      comments: [{ id: 1, content: "Public msg", createdAt: new Date().toISOString(), authorName: "Jennifer Anderson", authorRole: "REQUESTER" }],
      notes: [{ id: 1, content: "Internal note msg", createdAt: new Date().toISOString(), authorName: "Alex Thompson", authorRole: "IT_STAFF" }],
    } as never);

    renderAt("/queue/1");

    await waitFor(() => screen.getByText("Public msg"));
    expect(screen.getByText("Internal note msg")).toBeInTheDocument();
    expect(screen.getByText("Internal — IT Staff only")).toBeInTheDocument();
  });
});