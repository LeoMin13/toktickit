import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentPicker, { PendingFile } from "../../src/components/AttachmentPicker.js";
import { useState } from "react";

function Wrapper() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  return <AttachmentPicker files={files} onChange={setFiles} />;
}

describe("AttachmentPicker", () => {
  it("shows an inline error and excludes an oversized file from valid submission (UI-05)", async () => {
    render(<Wrapper />);

    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });

    const input = screen.getByLabelText(/Attachments/i);
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/exceeds the 5 MB limit/i)).toBeInTheDocument();
    });

    // "0 of 5" confirms the oversized file was NOT counted as valid/active
    expect(screen.getByText(/0 of 5 attachments/i)).toBeInTheDocument();
  });

  it("accepts a valid small file with no error", async () => {
    render(<Wrapper />);

    const okFile = new File(["content"], "photo.png", { type: "image/png" });
    const input = screen.getByLabelText(/Attachments/i);
    fireEvent.change(input, { target: { files: [okFile] } });

    await waitFor(() => {
      expect(screen.getByText("photo.png (0 KB)")).toBeInTheDocument();
    });
    expect(screen.getByText(/1 of 5 attachments/i)).toBeInTheDocument();
  });
});