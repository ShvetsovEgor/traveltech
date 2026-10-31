import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { api } from "../api/client";
import { useKiosk } from "../context/KioskContext";

const TOKEN_POLL_MS = 120_000;
const PUBLIC_PATHS = new Set(["/", "/guide/auth", "/dashboard"]);

/**
 * Redirects to the home screen when kiosk auth is lost.
 * Polls token validity (not slot status) while the guide session is active.
 */
export function KioskAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    kioskToken,
    isAuthenticated,
    authBootstrapped,
    deactivateKiosk,
  } = useKiosk();

  useEffect(() => {
    if (!authBootstrapped) return;
    if (isAuthenticated) return;
    if (PUBLIC_PATHS.has(location.pathname)) return;
    deactivateKiosk();
    navigate("/", { replace: true });
  }, [
    authBootstrapped,
    isAuthenticated,
    location.pathname,
    navigate,
    deactivateKiosk,
  ]);

  useEffect(() => {
    if (!authBootstrapped || !isAuthenticated || !kioskToken) return;

    let cancelled = false;

    const poll = async () => {
      try {
        await api.validateKioskToken(kioskToken);
      } catch {
        /* 401 clears auth via api client; network errors keep local session */
      }
      if (cancelled) return;
    };

    void poll();
    const id = window.setInterval(poll, TOKEN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authBootstrapped, isAuthenticated, kioskToken]);

  return null;
}
