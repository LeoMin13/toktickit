import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRequesters } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import type { Requester } from "../types.js";

type LoadState = "loading" | "loaded" | "empty" | "error";

export default function RequesterSelection() {
  const [state, setState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { setRequester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setState("loading");
    try {
      const data = await fetchRequesters();
      setRequesters(data);
      setSelectedId(data.length > 0 ? data[0].id : null);
      setState(data.length === 0 ? "empty" : "loaded");
    } catch {
      setState("error");
    }
  }

  function handleContinue() {
    const chosen = requesters.find((r) => r.id === selectedId);
    if (!chosen) return;
    setRequester(chosen);
    navigate("/tickets");
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="h4 mb-2">TokTickIT</h1>
      <h2 className="h5 mb-1">Select Development Requester</h2>
      <p className="text-muted small mb-4">
        Choose a development requester to simulate the current requester
        context for Lab 2. This is for testing only and is not a login
        screen.
      </p>

      {state === "loading" && <p role="status">Loading requesters…</p>}

      {state === "error" && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">Unable to load requesters. Please try again.</p>
          <button className="btn btn-outline-danger btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {state === "empty" && (
        <div className="alert alert-warning" role="alert">
          No active development requesters are available. Please contact an
          administrator.
        </div>
      )}

      {state === "loaded" && (
        <>
          <label htmlFor="requester-select" className="form-label fw-semibold">
            Development Requester *
          </label>
          <select
            id="requester-select"
            className="form-select mb-3"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {requesters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="alert alert-success small" role="note">
            Only active development requesters are shown.
          </div>

          <button className="btn btn-success w-100" onClick={handleContinue}>
            Continue →
          </button>
        </>
      )}
    </div>
  );
}