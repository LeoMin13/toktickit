import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RequesterSelection from "../../src/pages/RequesterSelection.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderWithProviders() {
  return render(
    <BrowserRouter>
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    </BrowserRouter>
  );
}

describe("RequesterSelection", () => {
  it("shows the dropdown with requesters on success", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "j@example.com" },
    ]);
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });
  });

  // UI-02
  it("shows an empty state when no active requesters exist", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText(/No active development requesters/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the API fails", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("network error"));
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText(/Unable to load requesters/i)).toBeInTheDocument();
    });
  });
});