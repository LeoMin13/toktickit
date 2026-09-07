import { useRef } from "react";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ACTIVE_ATTACHMENTS,
} from "../constants.js";

export interface PendingFile {
  file: File;
  error?: string;
}

interface Props {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
}

export default function AttachmentPicker({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | undefined {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.";
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return "File exceeds the 5 MB limit.";
    }
    return undefined;
  }

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    let activeSoFar = files.filter((f) => !f.error).length;
    const additions: PendingFile[] = [];

    Array.from(selected).forEach((file) => {
      let error = validateFile(file);
      if (!error) {
        if (activeSoFar >= MAX_ACTIVE_ATTACHMENTS) {
          error = "Maximum of 5 attachments reached.";
        } else {
          activeSoFar++;
        }
      }
      additions.push({ file, error });
    });

    onChange([...files, ...additions]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const activeCount = files.filter((f) => !f.error).length;

  return (
    <div>
      <label htmlFor="attachments" className="form-label fw-semibold">
        Attachments
      </label>
      <input
        id="attachments"
        ref={inputRef}
        type="file"
        className="form-control"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => handleFilesSelected(e.target.files)}
        disabled={activeCount >= MAX_ACTIVE_ATTACHMENTS}
      />
      <div className="form-text">
        {activeCount} of {MAX_ACTIVE_ATTACHMENTS} attachments
      </div>

      <ul className="list-unstyled mt-2">
        {files.map((f, i) => (
          <li
            key={`${f.file.name}-${i}`}
            className={`d-flex justify-content-between align-items-center py-1 ${
              f.error ? "text-danger" : ""
            }`}
          >
            <span>
              {f.file.name} ({Math.round(f.file.size / 1024)} KB)
            </span>
            {f.error && <span className="small">{f.error}</span>}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => removeFile(i)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}