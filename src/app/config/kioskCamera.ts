import type { KioskId } from "../api/types";

/** Поворот кадра по часовой при съёмке и в превью (градусы). */
export type CameraRotationCw = 0 | 90 | 180 | 270;

export type KioskCameraLayout = {
  rotationCw: CameraRotationCw;
  frameClassName: string;
  videoClassName: string;
  previewClassName: string;
  /** Мини-превью на следующих шагах (например, выбор сценария видео). */
  compactFrameClassName: string;
};

const DEFAULT_LAYOUT: KioskCameraLayout = {
  rotationCw: 0,
  frameClassName:
    "relative aspect-[4/3] w-full max-w-2xl max-h-[min(52vh,420px)] overflow-hidden p-0 bg-black",
  videoClassName: "h-full w-full object-cover",
  previewClassName: "h-full w-full object-cover",
  compactFrameClassName:
    "mx-auto mb-4 aspect-[4/3] w-full max-w-xs overflow-hidden p-0 bg-black sm:max-w-sm",
};

/** Камера на киоске Попова смонтирована с поворотом — компенсируем +90° по часовой. */
const POPOVA_LAYOUT: KioskCameraLayout = {
  rotationCw: 90,
  frameClassName:
    "relative aspect-[3/4] w-full max-w-md max-h-[min(70vh,560px)] overflow-hidden p-0 bg-black",
  videoClassName:
    "absolute left-1/2 top-1/2 h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover",
  previewClassName: "h-full w-full object-cover",
  compactFrameClassName:
    "mx-auto mb-4 aspect-[3/4] w-full max-w-xs overflow-hidden p-0 bg-black sm:max-w-sm",
};

export function getKioskCameraLayout(kioskId: KioskId | null): KioskCameraLayout {
  if (kioskId === "Popova") return POPOVA_LAYOUT;
  return DEFAULT_LAYOUT;
}
