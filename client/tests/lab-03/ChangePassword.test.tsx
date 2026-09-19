import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChangePassword from "../../src/pages/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderChangePassword() {
  vi.spyOn(api, "fetchMe").mockResolvedValue(null);
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("ChangePassword", () => {
  it("keeps Continue disabled until all rules pass and passwords match", () => {
    renderChangePassword();
    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Current/i), { target: { value: "Temp123!" } });
    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText(/Confirm/i), { target: { value: "weak" } });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: "Strong123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm/i), { target: { value: "Strong123!" } });
    expect(continueButton).not.toBeDisabled();
  });

  it("calls changePassword and refreshes on submit", async () => {
    vi.spyOn(api, "changePassword").mockResolvedValue(undefined);
    renderChangePassword();

    fireEvent.change(screen.getByLabelText(/Current/i), { target: { value: "Temp123!" } });
    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: "Strong123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm/i), { target: { value: "Strong123!" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith("Temp123!", "Strong123!");
    });
  });
});