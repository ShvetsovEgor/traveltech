import { useEffect, useState } from "react";
import { buildApiUrl } from "../api/resolveApiBase";

export type NetworkStatus = "online" | "offline" | "checking";

const DEFAULT_POLL_MS = 15_000;
const HEALTH_TIMEOUT_MS = 12_000;
/** Один сбой — не краснеем сразу (cold start Render / краткий обрыв). */
const FAILURES_BEFORE_OFFLINE = 2;

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timer));
}

/**
 * online = браузер online и API `/health` отвечает.
 * offline при navigator.onLine=false → реально нет сети;
 * offline при ответе health → сервер/API недоступен (не обязательно «нет интернета»).
 */
export function useNetworkStatus(pollMs = DEFAULT_POLL_MS): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let consecutiveFailures = 0;

    const check = async () => {
      if (!navigator.onLine) {
        consecutiveFailures = FAILURES_BEFORE_OFFLINE;
        if (!cancelled) setStatus("offline");
        return;
      }

      try {
        const res = await fetchWithTimeout(
          buildApiUrl("/health"),
          HEALTH_TIMEOUT_MS
        );
        if (cancelled) return;
        if (res.ok) {
          consecutiveFailures = 0;
          setStatus("online");
          return;
        }
        consecutiveFailures += 1;
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
      }

      if (consecutiveFailures >= FAILURES_BEFORE_OFFLINE) {
        setStatus("offline");
      } else if (!cancelled) {
        // Первый сбой — остаёмся в checking / предыдущем online, без красного.
        setStatus((prev) => (prev === "online" ? "online" : "checking"));
      }
    };

    const onOnline = () => {
      consecutiveFailures = 0;
      if (!cancelled) setStatus("checking");
      void check();
    };
    const onOffline = () => {
      consecutiveFailures = FAILURES_BEFORE_OFFLINE;
      if (!cancelled) setStatus("offline");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void check();

    const intervalId = window.setInterval(() => {
      void check();
    }, pollMs);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(intervalId);
    };
  }, [pollMs]);

  return status;
}
