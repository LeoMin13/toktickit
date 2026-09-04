import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../../src/App.js";
import MyTickets from "../../src/pages/MyTickets.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
});

describe("MyTickets routing", () => {
  it("redirects to Requester Selection when no requester is in context (UI-01)", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    window.history.pushState({}, "", "/tickets");

    render(
      <BrowserRouter>
        <RequesterProvider>
          <App />
        </RequesterProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Select Development Requester")).toBeInTheDocument();
    });
  });
});

// Test harness that lets the test trigger a REAL context update via the
// actual setRequester setter, exactly like AppShell's "Change Requester"
// action does — instead of poking sessionStorage behind React's back.
function SwitchableRequesterHarness() {
  const { setRequester } = useRequester();
  return (
    <>
      <button
        onClick={() => setRequester({ id: 1, name: "Jennifer Anderson", email: "j@example.com" })}
      >
        Select Jennifer
      </button>
      <button
        onClick={() => setRequester({ id: 2, name: "Michael Brown", email: "m@example.com" })}
      >
        Select Michael
      </button>
      <MyTickets />
    </>
  );
}

describe("MyTickets requester switching", () => {
  it("reloads the list and clears filters when the requester changes (UI-06)", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    render(
      <BrowserRouter>
        <RequesterProvider>
          <SwitchableRequesterHarness />
        </RequesterProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Select Jennifer"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("Select Michael"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    const lastCallQuery = fetchSpy.mock.calls[1][0];
    expect(lastCallQuery.search).toBeUndefined();
    expect(lastCallQuery.categoryId).toBeUndefined();
  });
});