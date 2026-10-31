import { useCallback, useEffect, useState } from "react";

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element })
      .webkitFullscreenElement ??
    null
  );
}

function isFullscreenSupported(): boolean {
  const root = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => void;
  };
  return Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() =>
    Boolean(getFullscreenElement())
  );
  const [supported] = useState(isFullscreenSupported);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(getFullscreenElement()));

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    sync();

    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const enter = useCallback(async () => {
    const root = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => void;
    };

    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch {
      /* жест пользователя или политика браузера */
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        const doc = document as Document & {
          webkitExitFullscreen?: () => void;
        };
        doc.webkitExitFullscreen?.();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(async () => {
    if (getFullscreenElement()) {
      await exit();
    } else {
      await enter();
    }
  }, [enter, exit]);

  return { isFullscreen, supported, enter, exit, toggle };
}
