import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../../src/App.js";
import MyTickets from "../../src/pages/MyTickets.js";
import { AuthProvider, useAuth } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
});

describe("MyTickets routing", () => {
  it("redirects to Login when no authenticated user is present (UI-01)", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(null);
    window.history.pushState({}, "", "/tickets");

    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    });
  });
});

// Test harness that triggers a REAL context update via the actual login()
// function, exactly like the Login screen does — instead of poking state
// behind React's back. api.login is mocked per-call to return a different
// user depending on which button was clicked.
function SwitchableUserHarness() {
  const { login } = useAuth();
  return (
    <>
      <button onClick={() => login("jennifer@example.com", "Requester123!")}>
        Select Jennifer
      </button>
      <button onClick={() => login("michael@example.com", "Requester123!")}>
        Select Michael
      </button>
      <MyTickets />
    </>
  );
}

describe("MyTickets requester switching", () => {
  it("reloads the list and clears filters when the authenticated user changes (UI-06)", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(null);

    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    vi.spyOn(api, "login").mockImplementation(async (email: string) => {
      if (email === "jennifer@example.com") {
        return { id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false };
      }
      return { id: 2, name: "Michael Brown", role: "REQUESTER", mustChangePassword: false };
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <SwitchableUserHarness />
        </AuthProvider>
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