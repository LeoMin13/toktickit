import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffTicketDetail, claimTicket, setItPriority, setTicketStatus, postNote,
} from "../api.js";
import type { StaffTicketDetail as StaffTicketDetailType } from "../types.js";

type LoadState = "loading" | "loaded" | "forbidden" | "not-found" | "error";

const STATUS_OPTIONS = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
  "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
];

export default function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [actionError, setActionError] = useState("");
  const [newNote, setNewNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;
    setState("loading");
    try {
      const data = await fetchStaffTicketDetail(Number(id));
      setTicket(data);
      setState("loaded");
    } catch (err) {
      const msg = (err as Error).message;
      setState(msg === "Forbidden" ? "forbidden" : msg === "Ticket not found" ? "not-found" : "error");
    }
  }

  async function handleClaim() {
    if (!ticket || !user) return;
    setActionError("");
    try {
      await claimTicket(ticket.id, user.id);
      await load();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!ticket) return;
    setActionError("");
    try {
      await setItPriority(ticket.id, e.target.value);
      await load();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!ticket) return;
    setActionError("");
    try {
      await setTicketStatus(ticket.id, e.target.value);
      await load();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function handlePostNote(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || newNote.trim().length === 0) return;
    setPostingNote(true);
    try {
      const note = await postNote(ticket.id, newNote.trim());
      setTicket((t) => (t ? { ...t, notes: [...t.notes, note] } : t));
      setNewNote("");
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setPostingNote(false);
    }
  }

  if (state === "loading") return <p role="status">Loading ticket…</p>;
  if (state === "forbidden")
    return <div className="alert alert-warning">Access denied.</div>;
  if (state === "not-found")
    return (
      <div className="alert alert-warning">
        Ticket not found. <Link to="/queue">Back to My Queue</Link>
      </div>
    );
  if (state === "error")
    return (
      <div className="alert alert-danger">
        <p className="mb-2">Unable to load this ticket.</p>
        <button className="btn btn-outline-danger btn-sm" onClick={load}>Retry</button>
      </div>
    );
  if (!ticket) return null;

  return (
    <div>
      <Link to="/queue" className="btn btn-outline-secondary btn-sm mb-3">← Back to My Queue</Link>

      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <section className="card p-3 mb-4" aria-label="Ticket Information">
        <h1 className="h5 mb-3">Ticket Information</h1>
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Ticket No.</div>
            <div className="p-2 rounded field-readonly">{ticket.ticketNumber}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Category</div>
            <div className="p-2 rounded field-readonly">{ticket.categoryName}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Related System</div>
            <div className="p-2 rounded field-readonly">{ticket.relatedSystemName}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Requester</div>
            <div className="p-2 rounded field-readonly">{ticket.requesterName}</div>
          </div>

          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Requested Priority</div>
            <span className={`badge badge-priority-${ticket.requestedPriority.toLowerCase()}`}>
              {ticket.requestedPriority}
            </span>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label fw-semibold small" htmlFor="itPriority">IT Priority</label>
            <select id="itPriority" className="form-select" value={ticket.itPriority ?? ""} onChange={handlePriorityChange}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label fw-semibold small" htmlFor="status">Current Status</label>
            <select id="status" className="form-select" value={ticket.currentStatus} onChange={handleStatusChange}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-label fw-semibold small">Ticket Owner</div>
            {ticket.ticketOwnerName ? (
              <div className="p-2 rounded field-readonly">{ticket.ticketOwnerName}</div>
            ) : (
              <button className="btn btn-sm btn-success" onClick={handleClaim}>Claim Ticket</button>
            )}
          </div>

          <div className="col-12">
            <div className="form-label fw-semibold small">Summary</div>
            <div className="p-2 rounded field-readonly">{ticket.summary}</div>
          </div>
          <div className="col-12">
            <div className="form-label fw-semibold small">Description</div>
            <div className="p-2 rounded field-readonly" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</div>
          </div>
          {ticket.problemAppearsResolved && (
            <div className="col-12">
              <div className="alert alert-success py-2 mb-0">
                The Requester has indicated this problem appears resolved.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card p-3 mb-4" aria-label="Public Comments">
        <h2 className="h6 mb-3">Public Comments</h2>
        <ul className="list-unstyled mb-0">
          {ticket.comments.map((c) => (
            <li key={c.id} className="p-2 rounded mb-2" style={{ backgroundColor: "#EAF6EF" }}>
              <div className="d-flex justify-content-between">
                <strong>{c.authorName}</strong>
                <span className="small text-muted">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div>{c.content}</div>
            </li>
          ))}
          {ticket.comments.length === 0 && <li className="text-muted small">No comments yet.</li>}
        </ul>
      </section>

      <section className="card p-3" aria-label="Internal Notes">
        <h2 className="h6 mb-1">Internal Notes</h2>
        <p className="text-muted small mb-3">Internal — IT Staff only</p>
        <ul className="list-unstyled mb-3">
          {ticket.notes.map((n) => (
            <li key={n.id} className="p-2 rounded mb-2" style={{ backgroundColor: "#FBF3E3" }}>
              <div className="d-flex justify-content-between">
                <strong>{n.authorName}</strong>
                <span className="small text-muted">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <div>{n.content}</div>
            </li>
          ))}
          {ticket.notes.length === 0 && <li className="text-muted small">No internal notes yet.</li>}
        </ul>
        <form onSubmit={handlePostNote} className="d-flex gap-2">
          <input
            className="form-control"
            placeholder="Add an internal note…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button className="btn btn-success" type="submit" disabled={postingNote}>
            {postingNote ? "Posting…" : "Post"}
          </button>
        </form>
      </section>
    </div>
  );
}