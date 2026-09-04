import { Navigate, Route, Routes } from "react-router-dom";
import RequesterSelection from "./pages/RequesterSelection.js";
import AppShell from "./components/AppShell.js";
import { useRequester } from "./context/RequesterContext.js";
import CreateTicket from "./pages/CreateTicket.js";
import MyTickets from "./pages/MyTickets.js";


function RequireRequester({ children }: { children: React.ReactElement }) {
  const { requester } = useRequester();
  if (!requester) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RequesterSelection />} />
      <Route
        element={
          <RequireRequester>
            <AppShell />
          </RequireRequester>
        }
      >
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/tickets/new" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<p>Ticket Detail — coming in Issue 7.</p>} />
      </Route>
    </Routes>
  );
}