import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Attachment removal flow", () => {
  it("removes an active attachment with a reason and reloads the ticket", async () => {
    vi.spyOn(api, "fetchTicketDetail")
      .mockResolvedValueOnce({
        ...baseTicket,
        attachments: [
          {
            id: 5,
            ticketId: 1,
            originalFileName: "battery-report.pdf",
            sizeBytes: 1024,
            mimeType: "application/pdf",
            uploadedAt: new Date().toISOString(),
            isRemoved: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        ...baseTicket,
        attachments: [
          {
            id: 5,
            ticketId: 1,
            originalFileName: "battery-report.pdf",
            sizeBytes: 1024,
            mimeType: "application/pdf",
            uploadedAt: new Date().toISOString(),
            isRemoved: true,
            removedAt: new Date().toISOString(),
            removalReason: "No longer needed",
          } as never,
        ],
      });

    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue(undefined);
    vi.spyOn(window, "prompt").mockReturnValue("No longer needed");

    renderAt("/tickets/1");

    await waitFor(() => screen.getByText("battery-report.pdf", { exact: false }));
    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(5, "No longer needed", 1);
    });
    await waitFor(() => {
      expect(screen.getByText("Removed")).toBeInTheDocument();
    });
  });
});