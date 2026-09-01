import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../../src/App.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderApp() {
  return render(
    <BrowserRouter>
      <RequesterProvider>
        <App />
      </RequesterProvider>
    </BrowserRouter>
  );
}

describe("App", () => {
  it("renders the TokTickIT heading on the Requester Selection screen", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    renderApp();
    await waitFor(() => {
      expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    });
  });
});