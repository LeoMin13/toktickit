import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStaffTickets, fetchCategories } from "../api.js";
import type { Category, PaginatedStaffTickets, StaffTicketListQuery } from "../types.js";

type LoadState = "loading" | "loaded" | "empty" | "no-results" | "forbidden" | "error";

const DEFAULT_QUERY: StaffTicketListQuery = {
  sort: "createdAt",
  order: "desc",
  page: 1,
  pageSize: 10,
};

export default function StaffTicketQueue() {
  const [state, setState] = useState<LoadState>("loading");
  const [result, setResult] = useState<PaginatedStaffTickets | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState<StaffTicketListQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function load() {
    setState("loading");
    try {
      const res = await fetchStaffTickets(query);
      setResult(res);
      if (res.data.length === 0) {
        const hasActiveFilter = Boolean(
          query.search || query.categoryId || query.requestedPriority || query.currentStatus
        );
        setState(hasActiveFilter ? "no-results" : "empty");
      } else {
        setState("loaded");
      }
    } catch (err) {
      setState((err as Error).message === "Forbidden" ? "forbidden" : "error");
    }
  }

  function updateQuery(patch: Partial<StaffTicketListQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput || undefined });
  }

  if (state === "forbidden") {
    return (
      <div className="alert alert-warning" role="alert">
        Access denied. This page is for IT Staff and Administrators only.
      </div>
    );
  }

  return (
    <div>
      <h1 className="h4 mb-3">My Queue</h1>

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
            value={query.ownerId ?? ""}
            onChange={(e) => updateQuery({ ownerId: e.target.value || undefined })}
          >
            <option value="">All Tickets</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <div className="col-12 col-md-2">
          <button type="submit" className="btn btn-outline-success w-100">Search</button>
        </div>
      </form>

      {state === "loading" && <p role="status">Loading queue…</p>}

      {state === "error" && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">Unable to load the queue. Please try again.</p>
          <button className="btn btn-outline-danger btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {state === "empty" && <div className="alert alert-secondary">No tickets in the queue yet.</div>}

      {state === "no-results" && (
        <div className="alert alert-secondary">No tickets match your filters.</div>
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
                <th>Req. Priority</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/queue/${t.id}`}>{t.ticketNumber}</Link></td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.summary}</td>
                  <td>{t.categoryName}</td>
                  <td>
                    <span className={`badge badge-priority-${t.requestedPriority.toLowerCase()}`}>
                      {t.requestedPriority}
                    </span>
                  </td>
                  <td><span className="badge badge-status-new">{t.currentStatus}</span></td>
                  <td>{t.ticketOwnerName ?? <span className="text-muted">Unassigned</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-md-none">
            {result.data.map((t) => (
              <Link
                to={`/queue/${t.id}`}
                key={t.id}
                className="card mb-2 p-3 text-decoration-none text-body"
              >
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className="badge badge-status-new">{t.currentStatus}</span>
                </div>
                <div>{t.summary}</div>
                <div className="text-muted small">
                  {t.categoryName} · {t.ticketOwnerName ?? "Unassigned"}
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