import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickets, fetchCategories } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import type { Category, PaginatedTickets, RequestedPriority, TicketListQuery } from "../types.js";

type LoadState = "loading" | "loaded" | "empty" | "no-results" | "error";

const DEFAULT_QUERY: TicketListQuery = {
  sort: "createdAt",
  order: "desc",
  page: 1,
  pageSize: 10,
};

export default function MyTickets() {
  const { requester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<PaginatedTickets | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState<TicketListQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // BR: switching Requester reloads the list and clears filters (Requester
  // identity change is handled by AppShell navigating away/back, so this
  // effect keys off requester?.id to reset local filter state too).
  useEffect(() => {
    setQuery(DEFAULT_QUERY);
    setSearchInput("");
  }, [requester?.id]);

  useEffect(() => {
    load();
  }, [query, requester?.id]);

  async function load() {
    if (!requester) return;
    setState("loading");
    try {
      const res = await fetchTickets(query, requester.id);
      setResult(res);
      if (res.data.length === 0) {
        const hasActiveFilter = Boolean(
          query.search || query.categoryId || query.requestedPriority || query.currentStatus
        );
        setState(hasActiveFilter ? "no-results" : "empty");
      } else {
        setState("loaded");
      }
    } catch {
      setState("error");
    }
  }

  function updateQuery(patch: Partial<TicketListQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput || undefined });
  }

  function clearFilters() {
    setSearchInput("");
    setQuery(DEFAULT_QUERY);
  }

  const hasActiveFilter = Boolean(
    query.search || query.categoryId || query.requestedPriority || query.currentStatus
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 mb-0">My Tickets</h1>
          <p className="text-muted small mb-0">View and track all of your support requests.</p>
        </div>
        <div className="d-flex gap-2">
          {hasActiveFilter && (
            <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          <Link to="/tickets/new" className="btn btn-success btn-sm">
            + Create Ticket
          </Link>
        </div>
      </div>

      <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-12 col-md-4">
          <input
            className="form-control"
            placeholder="Search by ticket number or summary…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select"
            value={query.categoryId ?? ""}
            onChange={(e) =>
              updateQuery({ categoryId: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select"
            value={query.requestedPriority ?? ""}
            onChange={(e) =>
              updateQuery({
                requestedPriority: (e.target.value || undefined) as RequestedPriority | undefined,
              })
            }
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-12 col-md-2">
          <button type="submit" className="btn btn-outline-success w-100">Search</button>
        </div>
      </form>

      {state === "loading" && <p role="status">Loading tickets…</p>}

      {state === "error" && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">Unable to load tickets. Please try again.</p>
          <button className="btn btn-outline-danger btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {state === "empty" && (
        <div className="alert alert-secondary" role="status">
          No tickets yet — <Link to="/tickets/new">create your first ticket</Link>.
        </div>
      )}

      {state === "no-results" && (
        <div className="alert alert-secondary" role="status">
          No tickets match your filters.{" "}
          <button className="btn btn-link p-0" onClick={clearFilters}>Clear Filters</button>
        </div>
      )}

      {state === "loaded" && result && (
        <>
          <table className="table d-none d-md-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Created Date</th>
                <th>Summary</th>
                <th>Category</th>
                <th>Requested Priority</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.summary}</td>
                  <td>{t.categoryName}</td>
                  <td>
                    <span className="badge bg-secondary">{t.requestedPriority}</span>
                  </td>
                  <td>
                    <span className="badge bg-success">{t.currentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-md-none">
            {result.data.map((t) => (
              <Link
                to={`/tickets/${t.id}`}
                key={t.id}
                className="card mb-2 p-3 text-decoration-none text-body"
              >
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className="badge bg-success">{t.currentStatus}</span>
                </div>
                <div>{t.summary}</div>
                <div className="text-muted small">
                  {t.categoryName} · {t.requestedPriority} · {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="small text-muted">
              Showing {(result.pagination.page - 1) * result.pagination.pageSize + 1}–
              {Math.min(result.pagination.page * result.pagination.pageSize, result.pagination.totalItems)} of{" "}
              {result.pagination.totalItems}
            </span>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={result.pagination.page <= 1}
                onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={result.pagination.page >= result.pagination.totalPages}
                onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}