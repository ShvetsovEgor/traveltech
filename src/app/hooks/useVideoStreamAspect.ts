import { useEffect, useState, type RefObject } from "react";
import type { CameraRotationCw } from "../config/kioskCamera";
import { computeCameraFrameAspect } from "../utils/cameraFrame";
import { isVideoFrameReady } from "../utils/media";

/** Актуальное width/height рамки превью по размерам видеопотока. */
export function useVideoStreamAspect(
  videoRef: RefObject<HTMLVideoElement | null>,
  rotationCw: CameraRotationCw,
  enabled: boolean
): number | null {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      if (!isVideoFrameReady(video)) return;
      const next = computeCameraFrameAspect(
        video.videoWidth,
        video.videoHeight,
        rotationCw
      );
      if (next) setAspect(next);
    };

    video.addEventListener("loadedmetadata", update);
    video.addEventListener("loadeddata", update);

    const observer = new ResizeObserver(update);
    observer.observe(video);

    update();

    return () => {
      video.removeEventListener("loadedmetadata", update);
      video.removeEventListener("loadeddata", update);
      observer.disconnect();
    };
  }, [videoRef, rotationCw, enabled]);

  return aspect;
}
