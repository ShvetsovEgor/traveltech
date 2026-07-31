import { useEffect, useRef } from "react";
import { api } from "../api/client";
import type { StickerPreviewItem } from "../api/types";

const DEFAULT_POLL_MS = 3000;
/** Видео Veo — долго; не срываемся из‑за одного сетевого сбоя опроса. */
const MAX_POLL_FAILURES = 10;

function formatTaskError(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes("location is not supported")) {
    return "Сервис генерации временно недоступен. Подождите немного и попробуйте снова.";
  }
  if (
    lowered.includes("failed_precondition") ||
    lowered.includes("503") ||
    lowered.includes("unavailable")
  ) {
    return "Сервис перегружен. Подождите и попробуйте снова.";
  }
  return message;
}

export function useTaskPolling(
  taskId: string | null,
  interactionToken: string | null,
  handlers: {
    onComplete: (resultUrl: string) => void;
    onStickerProgress?: (data: {
      previews: StickerPreviewItem[];
      progress: number;
      total: number;
    }) => void;
    onStickerPackComplete?: (data: {
      packUrl: string;
      previews: StickerPreviewItem[];
    }) => void;
    onError: (message: string) => void;
  },
  options?: { pollIntervalMs?: number }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const lastStickerProgressRef = useRef(-1);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    let finished = false;
    let consecutiveFailures = 0;
    lastStickerProgressRef.current = -1;
    const pollMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
    let intervalId = 0;

    const stopPolling = () => {
      finished = true;
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = 0;
      }
    };

    const poll = async () => {
      if (finished || cancelled) return;

      try {
        if (interactionToken) {
          try {
            await api.heartbeat(interactionToken);
          } catch {
            // Сессия могла смениться — статус задачи всё равно опрашиваем.
          }
        }
        const status = await api.getTaskStatus(taskId);
        if (cancelled || finished) return;

        consecutiveFailures = 0;

        if (status.status === "processing") {
          const progress =
            status.sticker_progress ??
            status.sticker_previews?.length ??
            0;
          if (
            progress > lastStickerProgressRef.current ||
            (progress > 0 && lastStickerProgressRef.current === -1)
          ) {
            lastStickerProgressRef.current = progress;
            handlersRef.current.onStickerProgress?.({
              previews: status.sticker_previews ?? [],
              progress,
              total: status.sticker_total ?? 4,
            });
          }
          return;
        }

        if (status.status === "completed") {
          if (
            status.sticker_pack_url &&
            status.sticker_previews &&
            status.sticker_previews.length > 0
          ) {
            stopPolling();
            handlersRef.current.onStickerPackComplete?.({
              packUrl: status.sticker_pack_url,
              previews: status.sticker_previews,
            });
            return;
          }
          if (status.result_url) {
            stopPolling();
            handlersRef.current.onComplete(status.result_url);
            return;
          }
          // Задача помечена завершённой, но ссылки на результат нет
          // (гонка при рестарте Redis) — не зависаем в опросе навечно.
          stopPolling();
          handlersRef.current.onError(
            "Генерация завершилась, но результат не найден. Попробуйте ещё раз."
          );
          return;
        }

        if (status.status === "failed" || status.status === "cancelled") {
          stopPolling();
          const progress =
            status.sticker_progress ?? status.sticker_previews?.length ?? 0;
          if (progress > 0 || (status.sticker_previews?.length ?? 0) > 0) {
            handlersRef.current.onStickerProgress?.({
              previews: status.sticker_previews ?? [],
              progress,
              total: status.sticker_total ?? 4,
            });
          }
          handlersRef.current.onError(
            formatTaskError(status.error_message ?? "Генерация не удалась")
          );
        }
      } catch (e) {
        if (cancelled || finished) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_POLL_FAILURES) {
          stopPolling();
          handlersRef.current.onError(
            e instanceof Error
              ? e.message
              : "Не удалось получить статус задачи"
          );
        }
      }
    };

    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, pollMs);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [taskId, interactionToken, options?.pollIntervalMs]);
}
