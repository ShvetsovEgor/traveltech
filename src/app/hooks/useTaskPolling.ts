import { useEffect, useRef } from "react";
import { api } from "../api/client";

const POLL_MS = 3000;
/** Видео Veo — долго; не срываемся из‑за одного сетевого сбоя опроса. */
const MAX_POLL_FAILURES = 10;

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
    let consecutiveFailures = 0;

    const poll = async () => {
      try {
        if (interactionToken) {
          await api.heartbeat(interactionToken);
        }
        const status = await api.getTaskStatus(taskId);
        if (cancelled) return;

        consecutiveFailures = 0;

        if (status.status === "completed" && status.result_url) {
          handlersRef.current.onComplete(status.result_url);
          return;
        }
        if (status.status === "failed" || status.status === "cancelled") {
          handlersRef.current.onError(
            status.error_message ?? "Генерация не удалась"
          );
        }
      } catch (e) {
        if (cancelled) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_POLL_FAILURES) {
          handlersRef.current.onError(
            e instanceof Error
              ? e.message
              : "Не удалось получить статус задачи"
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
