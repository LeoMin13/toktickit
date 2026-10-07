import { useEffect, useState } from "react";
import { fetchUsers, createUser, updateUser, setUserPassword } from "../api.js";
import type { AdminUser } from "../types.js";

type LoadState = "loading" | "loaded" | "forbidden" | "error";

export default function UserManagement() {
  const [state, setState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  async function load() {
    setState("loading");
    try {
      const data = await fetchUsers(search || undefined, roleFilter || undefined);
      setUsers(data);
      setState("loaded");
    } catch (err) {
      setState((err as Error).message === "Forbidden" ? "forbidden" : "error");
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setFormError("");
    setFieldErrors({});
    try {
      await createUser({
        name: String(form.get("name")),
        email: String(form.get("email")),
        role: String(form.get("role")),
        isActive: form.get("isActive") === "on",
        initialPassword: String(form.get("initialPassword")),
      });
      setShowCreate(false);
      await load();
    } catch (err) {
      const e2 = err as Error & { fields?: Record<string, string> };
      if (e2.fields) setFieldErrors(e2.fields);
      else setFormError(e2.message);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    setFormError("");
    try {
      await updateUser(editing.id, {
        name: String(form.get("name")),
        email: String(form.get("email")),
        role: String(form.get("role")),
        isActive: form.get("isActive") === "on",
      });
      setEditing(null);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function handleResetPassword() {
    if (!editing) return;
    const newPassword = window.prompt("New initial password (min 8 characters):");
    if (!newPassword) return;
    try {
      await setUserPassword(editing.id, newPassword);
      setFormError("");
      alert("Password updated. The user must change it at next login.");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  if (state === "forbidden") {
    return <div className="alert alert-warning">Access denied. This page is for Administrators only.</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Users</h1>
        <button className="btn btn-success btn-sm" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="REQUESTER">Requester</option>
            <option value="IT_STAFF">IT Staff</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
      </div>

      {state === "loading" && <p role="status">Loading users…</p>}
      {state === "error" && <div className="alert alert-danger">Unable to load users.</div>}

      {state === "loaded" && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`badge ${u.isActive ? "bg-success" : "bg-secondary"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(u)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <div className="card p-3 mt-3" style={{ maxWidth: 420 }}>
          <h2 className="h6 mb-3">Create New User</h2>
          <form onSubmit={handleCreate}>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="name">Full Name</label>
              <input id="name" name="name" className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`} />
              {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`} />
              {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
            </div>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="role">Role</label>
              <select id="role" name="role" className="form-select">
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="form-check mb-2">
              <input id="isActive" name="isActive" type="checkbox" className="form-check-input" defaultChecked />
              <label className="form-check-label" htmlFor="isActive">Active</label>
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold" htmlFor="initialPassword">Initial Password</label>
              <input
                id="initialPassword" name="initialPassword" type="password"
                className={`form-control ${fieldErrors.initialPassword ? "is-invalid" : ""}`}
              />
              {fieldErrors.initialPassword && <div className="invalid-feedback">{fieldErrors.initialPassword}</div>}
            </div>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <div className="d-flex gap-2">
              <button className="btn btn-success" type="submit">Save User</button>
              <button className="btn btn-outline-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="card p-3 mt-3" style={{ maxWidth: 420 }}>
          <h2 className="h6 mb-3">Edit User</h2>
          <form onSubmit={handleEdit}>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="edit-name">Full Name</label>
              <input id="edit-name" name="name" className="form-control" defaultValue={editing.name} />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="edit-email">Email</label>
              <input id="edit-email" name="email" type="email" className="form-control" defaultValue={editing.email} />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-semibold" htmlFor="edit-role">Role</label>
              <select id="edit-role" name="role" className="form-select" defaultValue={editing.role}>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="form-check mb-3">
              <input id="edit-isActive" name="isActive" type="checkbox" className="form-check-input" defaultChecked={editing.isActive} />
              <label className="form-check-label" htmlFor="edit-isActive">Active</label>
            </div>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <div className="d-flex gap-2">
              <button className="btn btn-success" type="submit">Save</button>
              <button className="btn btn-outline-secondary" type="button" onClick={handleResetPassword}>
                Set New Password
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}