import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

export default function AppShell() {
  const { requester, clearRequester } = useRequester();
  const navigate = useNavigate();

  function handleChangeRequester() {
    clearRequester();
    navigate("/");
  }

  return (
    <div>
      <header className="navbar navbar-dark px-3" style={{ backgroundColor: "#006B3C" }}>
        <span className="navbar-brand mb-0 h1">TokTickIT</span>
        <nav className="d-flex gap-3">
          <NavLink to="/tickets" className="nav-link text-white">
            My Tickets
          </NavLink>
          <NavLink to="/tickets/new" className="nav-link text-white">
            Create Ticket
          </NavLink>
        </nav>
        <div className="d-flex align-items-center gap-2 text-white">
          <span>{requester?.name}</span>
          <button className="btn btn-outline-light btn-sm" onClick={handleChangeRequester}>
            Change Requester
          </button>
        </div>
      </header>
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}