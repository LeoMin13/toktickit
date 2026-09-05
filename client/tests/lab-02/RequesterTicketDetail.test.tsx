import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TicketDetail from "../../src/pages/TicketDetail.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderAt(path: string) {
  sessionStorage.setItem(
    "toktickit.devRequesterId",
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@example.com" })
  );
  window.history.pushState({}, "", path);
  return render(
    <BrowserRouter>
      <RequesterProvider>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}

describe("TicketDetail", () => {
  it("shows only a Download action for the active attachment, and metadata for the removed one (UI-07)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      categoryName: "Hardware",
      relatedSystemId: 1,
      relatedSystemName: "Corporate Laptop",
      summary: "Laptop battery drains quickly",
      description: "Long description here.",
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [
        {
          id: 1,
          ticketId: 1,
          originalFileName: "battery-report.pdf",
          sizeBytes: 1024,
          mimeType: "application/pdf",
          uploadedAt: new Date().toISOString(),
          isRemoved: false,
        },
        {
          id: 2,
          ticketId: 1,
          originalFileName: "screenshot.png",
          sizeBytes: 2048,
          mimeType: "image/png",
          uploadedAt: new Date().toISOString(),
          isRemoved: true,
          removedAt: new Date().toISOString(),
          removalReason: "Uploaded wrong file",
        } as never,
      ],
    });

    renderAt("/tickets/1");

    await waitFor(() => {
      expect(screen.getByText("battery-report.pdf", { exact: false })).toBeInTheDocument();
    });

    expect(screen.getAllByText("Download")).toHaveLength(1);
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded wrong file/i)).toBeInTheDocument();
  });

  it("shows a not-found message for a ticket belonging to another requester", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(new Error("Ticket not found"));
    renderAt("/tickets/999");

    await waitFor(() => {
      expect(screen.getByText("Ticket not found.")).toBeInTheDocument();
    });
  });
});