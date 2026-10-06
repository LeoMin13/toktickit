import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.js";
import CreateTicket from "./pages/CreateTicket.js";
import MyTickets from "./pages/MyTickets.js";
import TicketDetail from "./pages/TicketDetail.js";
import Login from "./pages/Login.js";
import ChangePassword from "./pages/ChangePassword.js";
import { useAuth } from "./context/AuthContext.js";
import StaffTicketQueue from "./pages/StaffTicketQueue.js";



function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (user?.role === "IT_STAFF" || user?.role === "ADMIN") {
    return <Navigate to="/queue" replace />;
  }
  return <Navigate to="/tickets" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/tickets/new" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/queue" element={<StaffTicketQueue />} />
        <Route path="/queue/:id" element={<p>Staff Ticket Detail — coming in Issue 8.</p>} />
      </Route>
    </Routes>
  );
}