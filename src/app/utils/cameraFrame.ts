import type { CameraRotationCw } from "../config/kioskCamera";
import { MIN_PORTRAIT_SIDE_PX } from "./media";

/** Соотношение сторон рамки (ширина / высота) под фактический видеопоток. */
export function computeCameraFrameAspect(
  videoWidth: number,
  videoHeight: number,
  rotationCw: CameraRotationCw
): number | null {
  if (
    videoWidth < MIN_PORTRAIT_SIDE_PX ||
    videoHeight < MIN_PORTRAIT_SIDE_PX
  ) {
    return null;
  }
  if (rotationCw === 90 || rotationCw === 270) {
    return videoHeight / videoWidth;
  }
  return videoWidth / videoHeight;
}
