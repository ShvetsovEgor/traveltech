import { useEffect, useRef } from "react";
import { api } from "../api/client";

const POLL_MS = 3000;

export function useTaskPolling(
  taskId: string | null,
  interactionToken: string | null,
  handlers: {
    onComplete: (resultUrl: string) => void;
    onError: (message: string) => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        if (interactionToken) {
          await api.heartbeat(interactionToken);
        }
        const status = await api.getTaskStatus(taskId);
        if (cancelled) return;

        if (status.status === "completed" && status.result_url) {
          handlersRef.current.onComplete(status.result_url);
          return;
        }
        if (status.status === "failed" || status.status === "cancelled") {
          handlersRef.current.onError(
            status.error_message ?? `Generation ${status.status}`
          );
        }
      } catch (e) {
        if (!cancelled) {
          handlersRef.current.onError(
            e instanceof Error ? e.message : "Status check failed"
          );
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [taskId, interactionToken]);
}
