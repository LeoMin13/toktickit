import { Navigate, Route, Routes } from "react-router-dom";
import RequesterSelection from "./pages/RequesterSelection.js";
import AppShell from "./components/AppShell.js";
import { useRequester } from "./context/RequesterContext.js";

// Placeholder screens until Issues 4/6/7 implement them.
function MyTicketsPlaceholder() {
  return <p>My Tickets — coming in Issue 6.</p>;
}
function CreateTicketPlaceholder() {
  return <p>Create Ticket — coming in Issue 4.</p>;
}

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
        <Route path="/tickets" element={<MyTicketsPlaceholder />} />
        <Route path="/tickets/new" element={<CreateTicketPlaceholder />} />
      </Route>
    </Routes>
  );
}