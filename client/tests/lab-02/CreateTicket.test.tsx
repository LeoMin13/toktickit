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

describe("CreateTicket", () => {
  it("shows a field-level message and does not call the API when Summary is empty (UI-03)", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    renderWithProviders();

    await waitFor(() => screen.getByLabelText(/Summary/i));
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "A description that is definitely long enough." },
    });
    fireEvent.click(screen.getByText("Submit Ticket"));

    await waitFor(() => {
      expect(screen.getByText(/Summary must be between/i)).toBeInTheDocument();
    });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("shows a safe error and retains field values when the API rejects (UI-04)", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Backend unavailable"));
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
      expect(screen.getByText(/Backend unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Summary/i)).toHaveValue("Laptop battery drains quickly");
  });
});