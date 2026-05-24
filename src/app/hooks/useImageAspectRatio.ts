import { useEffect, useState } from "react";

/** Соотношение сторон (ширина / высота) загруженного изображения. */
export function useImageAspectRatio(
  url: string | null | undefined,
  fallback: number = 1
): number {
  const [aspect, setAspect] = useState(fallback);

  useEffect(() => {
    if (!url) {
      setAspect(fallback);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.onerror = () => {
      if (!cancelled) setAspect(fallback);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url, fallback]);

  return aspect;
}
