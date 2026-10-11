import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

const ROLE_LABELS: Record<string, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMIN: "Administrator",
};

function navClass({ isActive }: { isActive: boolean }) {
  return `nav-link text-white ${isActive ? "nav-link-active" : ""}`;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div>
      <header className="navbar navbar-dark px-3" style={{ backgroundColor: "#006B3C" }}>
        <span className="navbar-brand mb-0 h1">TokTickIT</span>

        <nav className="d-flex gap-3">
          {user?.role === "REQUESTER" && (
            <>
              <NavLink to="/tickets" end className={navClass}>My Tickets</NavLink>
              <NavLink to="/tickets/new" className={navClass}>Create Ticket</NavLink>
            </>
          )}
          {(user?.role === "IT_STAFF" || user?.role === "ADMIN") && (
            <NavLink to="/queue" className={navClass}>My Queue</NavLink>
          )}
          {user?.role === "ADMIN" && (
            <NavLink to="/admin/users" className={navClass}>Users</NavLink>
          )}
        </nav>

        <div className="d-flex align-items-center gap-2 text-white">
          <span>{user?.name}</span>
          {user && (
            <span className={`badge badge-role-${user.role.toLowerCase()}`}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          )}
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}