import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

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
          <NavLink
            to="/tickets"
            end
            className={({ isActive }) => `nav-link text-white ${isActive ? "nav-link-active" : ""}`}
          >
            My Tickets
          </NavLink>
          <NavLink
            to="/tickets/new"
            className={({ isActive }) => `nav-link text-white ${isActive ? "nav-link-active" : ""}`}
          >
            Create Ticket
          </NavLink>
        </nav>
        <div className="d-flex align-items-center gap-2 text-white">
          <span>{user?.name} ({user?.role})</span>
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