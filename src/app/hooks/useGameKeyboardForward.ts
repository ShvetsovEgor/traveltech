import { type RefObject, useEffect } from "react";

const SCROLL_KEYS = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Пробрасывает клавиши в iframe, когда фокус на диалоге (кнопка закрытия и т.п.).
 * Игры слушают window внутри iframe — без фокуса клавиши туда не доходят.
 */
export function useGameKeyboardForward(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const relay =
      (type: "keydown" | "keyup") => (event: KeyboardEvent) => {
        const iframe = iframeRef.current;
        const win = iframe?.contentWindow;
        if (!win) return;

        if (document.activeElement === iframe) return;

        win.dispatchEvent(
          new KeyboardEvent(type, {
            key: event.key,
            code: event.code,
            location: event.location,
            repeat: event.repeat,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            bubbles: true,
            cancelable: true,
          }),
        );

        if (type === "keydown" && SCROLL_KEYS.has(event.code)) {
          event.preventDefault();
        }
      };

    const onKeyDown = relay("keydown");
    const onKeyUp = relay("keyup");

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [enabled, iframeRef]);
}
