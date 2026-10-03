import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../../src/App.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderApp() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe("App", () => {
  it("renders the TokTickIT heading on the Requester Selection screen", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue({
      id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
    });
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    });
  });
});