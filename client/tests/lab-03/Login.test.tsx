import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Login from "../../src/pages/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderLogin() {
  vi.spyOn(api, "fetchMe").mockResolvedValue(null);
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("Login", () => {
  it("shows a generic error on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email or password."));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });

  it("calls login with the entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue({
      id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jennifer@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "Requester123!" } });
    fireEvent.click(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("jennifer@example.com", "Requester123!");
    });
  });
});
