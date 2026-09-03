import { useEffect, useState, FormEvent } from "react";
import { fetchCategories, fetchRelatedSystems, createTicket } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import type { Category, RelatedSystem, RequestedPriority, Ticket } from "../types.js";

type RefState = "loading" | "loaded" | "error";
type SubmitState = "idle" | "submitting" | "success" | "error";

export default function CreateTicket() {
  const { requester } = useRequester();
  const [refState, setRefState] = useState<RefState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<RequestedPriority>("MEDIUM");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  async function loadReferenceData() {
    setRefState("loading");
    try {
      const [cats, systems] = await Promise.all([fetchCategories(), fetchRelatedSystems()]);
      setCategories(cats);
      setRelatedSystems(systems);
      if (cats.length > 0) setCategoryId(cats[0].id);
      if (systems.length > 0) setRelatedSystemId(systems[0].id);
      setRefState("loaded");
    } catch {
      setRefState("error");
    }
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const s = summary.trim();
    const d = description.trim();
    if (s.length < 5 || s.length > 120) {
      errors.summary = "Summary must be between 5 and 120 characters.";
    }
    if (d.length < 10 || d.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }
    if (categoryId === "") errors.categoryId = "Category is required.";
    if (relatedSystemId === "") errors.relatedSystemId = "Related System is required.";
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitState === "submitting") return; // BR-07: no duplicate submission

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitState("submitting");
    try {
      const ticket = await createTicket(
        {
          categoryId: categoryId as number,
          relatedSystemId: relatedSystemId as number,
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
        },
        requester!.id
      );
      setCreatedTicket(ticket);
      setSubmitState("success");
    } catch (err) {
      const e = err as Error & { fields?: Record<string, string> };
      if (e.fields) {
        setFieldErrors(e.fields);
        setSubmitState("idle");
      } else {
        setErrorMsg(e.message || "Unable to create ticket. Please try again.");
        setSubmitState("error"); // BR-07: values are retained (no reset here)
      }
    }
  }

  if (submitState === "success" && createdTicket) {
    return (
      <div className="alert alert-success" role="status">
        <h2 className="h5">Ticket created</h2>
        <p className="mb-1">
          Your official Ticket Number is <strong>{createdTicket.ticketNumber}</strong>.
        </p>
      </div>
    );
  }

  if (refState === "loading") return <p role="status">Loading form…</p>;

  if (refState === "error") {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">Unable to load categories or related systems.</p>
        <button className="btn btn-outline-danger btn-sm" onClick={loadReferenceData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="h4 mb-4">Create Ticket</h1>

      {submitState === "error" && (
        <div className="alert alert-danger" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="category" className="form-label fw-semibold">Category *</label>
        <select
          id="category"
          className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {fieldErrors.categoryId && <div className="invalid-feedback">{fieldErrors.categoryId}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="relatedSystem" className="form-label fw-semibold">Related System *</label>
        <select
          id="relatedSystem"
          className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
          value={relatedSystemId}
          onChange={(e) => setRelatedSystemId(Number(e.target.value))}
        >
          {relatedSystems.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {fieldErrors.relatedSystemId && (
          <div className="invalid-feedback">{fieldErrors.relatedSystemId}</div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="requestedPriority" className="form-label fw-semibold">Requested Priority *</label>
        <select
          id="requestedPriority"
          className="form-select"
          value={requestedPriority}
          onChange={(e) => setRequestedPriority(e.target.value as RequestedPriority)}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="summary" className="form-label fw-semibold">Summary *</label>
        <input
          id="summary"
          type="text"
          className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        {fieldErrors.summary && <div className="invalid-feedback">{fieldErrors.summary}</div>}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="form-label fw-semibold">Description *</label>
        <textarea
          id="description"
          className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
      </div>

      <button type="submit" className="btn btn-success" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting…" : "Submit Ticket"}
      </button>
    </form>
  );
}