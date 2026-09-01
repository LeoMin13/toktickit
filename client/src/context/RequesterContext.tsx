import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Requester } from "../types.js";

const STORAGE_KEY = "toktickit.devRequesterId";

interface RequesterContextValue {
  requester: Requester | null;
  setRequester: (r: Requester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

// NOTE: sessionStorage here is only a Lab 2 testing convenience for the
// Development Requester picker. It is NOT authentication and will be
// replaced by a real session in Lab 3.
export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequesterState] = useState<Requester | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Requester) : null;
  });

  useEffect(() => {
    if (requester) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [requester]);

  function setRequester(r: Requester) {
    setRequesterState(r);
  }

  function clearRequester() {
    setRequesterState(null);
  }

  return (
    <RequesterContext.Provider value={{ requester, setRequester, clearRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const ctx = useContext(RequesterContext);
  if (!ctx) throw new Error("useRequester must be used within a RequesterProvider");
  return ctx;
}