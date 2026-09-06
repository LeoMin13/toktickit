import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTicketDetail, TicketDetail as TicketDetailType } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import { useRef } from "react";
import { uploadAttachment, removeAttachment, attachmentDownloadUrl } from "../api.js";


type LoadState = "loading" | "loaded" | "not-found" | "error";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-success",
  MEDIUM: "bg-warning text-dark",
  HIGH: "bg-danger",
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    load();
  }, [id, requester?.id]);

  async function load() {
    if (!requester || !id) return;
    setState("loading");
    try {
      const data = await fetchTicketDetail(Number(id), requester.id);
      setTicket(data);
      setState("loaded");
    } catch (err) {
      if ((err as Error).message === "Ticket not found") {
        setState("not-found");
      } else {
        setState("error");
      }
    }
  }

  async function handleAddAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket || !requester) return;

    setUploadError("");
    try {
        await uploadAttachment(ticket.id, file, requester.id);
        await load(); // reload to show the new attachment
    } catch (err) {
        setUploadError((err as Error).message);
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(attachmentId: number) {
    if (!requester) return;
    const reason = window.prompt("Reason for removing this attachment (minimum 3 characters):");
    if (reason === null) return; // cancelled
    if (reason.trim().length < 3) {
        setUploadError("Removal reason must be at least 3 characters.");
        return;
    }

    setRemovingId(attachmentId);
    try {
        await removeAttachment(attachmentId, reason.trim(), requester.id);
        await load();
    } catch (err) {
        setUploadError((err as Error).message);
    } finally {
        setRemovingId(null);
    }
  }

  if (state === "loading") return <p role="status">Loading ticket…</p>;

  if (state === "not-found") {
    return (
      <div className="alert alert-warning" role="alert">
        <p className="mb-2">Ticket not found.</p>
        <Link to="/tickets">← Back to My Tickets</Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">Unable to load this ticket. Please try again.</p>
        <button className="btn btn-outline-danger btn-sm" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!ticket) return null;

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);

  return (
    <div>
      <Link to="/tickets" className="btn btn-outline-secondary btn-sm mb-3">
        ← Back to My Tickets
      </Link>

      <section className="card p-3 mb-4" aria-label="Ticket Information">
        <h1 className="h5 mb-3">Ticket Information</h1>
        <div className="row g-3">
          <ReadOnlyField label="Ticket No." value={ticket.ticketNumber} />
          <ReadOnlyField label="Created Date" value={new Date(ticket.createdAt).toLocaleString()} />
          <ReadOnlyField label="Category" value={ticket.categoryName} />
          <ReadOnlyField label="Related System" value={ticket.relatedSystemName} />
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Requested Priority</div>
            <span className={`badge ${PRIORITY_BADGE[ticket.requestedPriority]}`}>
              {ticket.requestedPriority}
            </span>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Current Status</div>
            <span className="badge bg-secondary">{ticket.currentStatus}</span>
          </div>
          <ReadOnlyField label="Summary" value={ticket.summary} full />
          <ReadOnlyField label="Description" value={ticket.description} full multiline />
        </div>
      </section>

      <section className="card p-3" aria-label="Attachments">
        <h2 className="h6 mb-3">Attachments</h2>
        {ticket.attachments.length === 0 && (
          <p className="text-muted small mb-0">No attachments on this ticket.</p>
        )}

        {activeAttachments.length > 0 && (
            <ul className="list-unstyled mb-3">
                {activeAttachments.map((a) => (
                <li key={a.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span>{a.originalFileName} ({Math.round(a.sizeBytes / 1024)} KB)</span>
                    <div className="d-flex gap-2">
                    <a className="btn btn-sm btn-outline-success" href={attachmentDownloadUrl(a.id)}>
                        Download
                    </a>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemove(a.id)}
                        disabled={removingId === a.id}
                    >
                        {removingId === a.id ? "Removing…" : "Remove"}
                    </button>
                    </div>
                </li>
                ))}
            </ul>
            )}

        {removedAttachments.length > 0 && (
          <ul className="list-unstyled mb-0 opacity-50">
            {removedAttachments.map((a) => (
              <li key={a.id} className="py-1 border-bottom">
                <div className="d-flex justify-content-between">
                  <span>{a.originalFileName}</span>
                  <span className="badge bg-secondary">Removed</span>
                </div>
                <div className="small text-muted">
                  {a.removalReason} — removed {a.removedAt && new Date(a.removedAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
            <label htmlFor="add-attachment" className="form-label fw-semibold small">
                Add Attachment
            </label>
            <input
                id="add-attachment"
                ref={fileInputRef}
                type="file"
                className="form-control"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleAddAttachment}
                disabled={activeAttachments.length >= 5}
            />
            {activeAttachments.length >= 5 && (
                <div className="form-text">Maximum of 5 active attachments reached.</div>
            )}
            {uploadError && (
                <div className="alert alert-danger mt-2 py-2 px-3 mb-0" role="alert">
                {uploadError}
                </div>
            )}
            </div>
      </section>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  full,
  multiline,
}: {
  label: string;
  value: string;
  full?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={full ? "col-12" : "col-6 col-md-3"}>
      <div className="form-label fw-semibold small">{label}</div>
      <div
        className="p-2 rounded"
        style={{ backgroundColor: "#EEF3F0", whiteSpace: multiline ? "pre-wrap" : "normal" }}
      >
        {value}
      </div>
    </div>
  );
}