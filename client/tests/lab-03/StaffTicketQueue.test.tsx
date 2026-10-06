import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import StaffTicketQueue from "../../src/pages/StaffTicketQueue.js";
import * as api from "../../src/api.js";

function render_() {
  return render(
    <BrowserRouter>
      <StaffTicketQueue />
    </BrowserRouter>
  );
}

describe("StaffTicketQueue", () => {
  it("renders ticket rows from mocked data", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [
        {
          id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop battery drains quickly",
          categoryId: 1, categoryName: "Hardware", requestedPriority: "MEDIUM",
          currentStatus: "NEW", ticketOwnerId: null, ticketOwnerName: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });

    render_();
        await waitFor(() => {
            expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThanOrEqual(1);
        });
        expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
    });

  it("shows a forbidden state for non-staff roles", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTickets").mockRejectedValue(new Error("Forbidden"));

    render_();
    await waitFor(() => {
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    });
  });
});