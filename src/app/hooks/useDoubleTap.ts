import { useCallback, useRef } from "react";

/** Двойной тап/клик в пределах intervalMs вызывает action. */
export function useDoubleTapAction(
  action: () => void,
  intervalMs = 400
): () => void {
  const lastTapRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current <= intervalMs) {
      lastTapRef.current = 0;
      action();
      return;
    }
    lastTapRef.current = now;
  }, [action, intervalMs]);
}
