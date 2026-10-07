import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import UserManagement from "../../src/pages/UserManagement.js";
import * as api from "../../src/api.js";

describe("UserManagement", () => {
  it("shows an inline error when creating a user with a duplicate email (UI-06)", async () => {
    vi.spyOn(api, "fetchUsers").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", role: "REQUESTER", isActive: true },
    ]);
    const createSpy = vi.spyOn(api, "createUser").mockRejectedValue(
      Object.assign(new Error("Duplicate"), { fields: { email: "This email is already in use" } })
    );

    render(<BrowserRouter><UserManagement /></BrowserRouter>);
    await waitFor(() => screen.getByText("Jennifer Anderson"));

    fireEvent.click(screen.getByText("+ Create User"));
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jennifer@example.com" } });
    fireEvent.change(screen.getByLabelText("Initial Password"), { target: { value: "Temp12345!" } });
    fireEvent.click(screen.getByText("Save User"));

    await waitFor(() => {
      expect(screen.getByText("This email is already in use")).toBeInTheDocument();
    });
    expect(createSpy).toHaveBeenCalled();
  });

  it("shows a forbidden state for non-Admin roles", async () => {
    vi.spyOn(api, "fetchUsers").mockRejectedValue(new Error("Forbidden"));
    render(<BrowserRouter><UserManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    });
  });
});