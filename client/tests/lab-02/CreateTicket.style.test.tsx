import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CreateTicket from "../../src/pages/CreateTicket.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderWithProviders() {
  sessionStorage.setItem(
    "toktickit.devRequesterId",
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@example.com" })
  );
  return render(
    <BrowserRouter>
      <RequesterProvider>
        <CreateTicket />
      </RequesterProvider>
    </BrowserRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
});

describe("CreateTicket — Zen Green style states (STYLE-01)", () => {
  it("applies the is-invalid class to a field that failed validation", async () => {
    renderWithProviders();

    await waitFor(() => screen.getByLabelText(/Summary/i));
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "A description that is definitely long enough." },
    });
    fireEvent.click(screen.getByText("Submit Ticket"));

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/i)).toHaveClass("is-invalid");
    });
  });

  it("does not apply is-invalid to a field before any submission attempt", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByLabelText(/Summary/i));
    expect(screen.getByLabelText(/Summary/i)).not.toHaveClass("is-invalid");
  });

  it("applies the field-readonly class to the Requester field", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByLabelText(/Summary/i));
    const requesterValue = screen.getByText("Jennifer Anderson");
    expect(requesterValue).toHaveClass("field-readonly");
  });
});

describe("CreateTicket — Submit button busy state (STYLE-02)", () => {
  it("disables the Submit button and shows the busy label while submitting", async () => {
    let resolveCreate: (value: unknown) => void;
    vi.spyOn(api, "createTicket").mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }) as never
    );

    renderWithProviders();
    await waitFor(() => screen.getByLabelText(/Summary/i));

    fireEvent.change(screen.getByLabelText(/Summary/i), {
      target: { value: "Laptop battery drains quickly" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "A description that is definitely long enough for validation." },
    });

    fireEvent.click(screen.getByText("Submit Ticket"));

    await waitFor(() => {
      expect(screen.getByText("Submitting…")).toBeInTheDocument();
    });
    expect(screen.getByText("Submitting…")).toBeDisabled();

    // Resolve the pending create so the test doesn't leave a dangling promise
    resolveCreate!({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Laptop battery drains quickly",
      description: "A description that is definitely long enough for validation.",
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it("the Submit button is not disabled in the idle state", async () => {
    renderWithProviders();
    await waitFor(() => screen.getByLabelText(/Summary/i));
    expect(screen.getByText("Submit Ticket")).not.toBeDisabled();
  });
});