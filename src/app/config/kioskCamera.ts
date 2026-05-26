import type { KioskId } from "../api/types";

/** Поворот кадра по часовой при съёмке и в превью (градусы). */
export type CameraRotationCw = 0 | 90 | 180 | 270;

export type KioskCameraLayout = {
  rotationCw: CameraRotationCw;
  /** Ожидаемое соотношение сторон снимка (ширина / высота). */
  photoAspectRatio: number;
  frameClassName: string;
  videoClassName: string;
  previewClassName: string;
  /** Мини-превью на следующих шагах (например, выбор сценария видео). */
  compactFrameClassName: string;
};

const DEFAULT_LAYOUT: KioskCameraLayout = {
  rotationCw: 0,
  photoAspectRatio: 4 / 3,
  frameClassName:
    "relative aspect-[4/3] w-full max-w-2xl max-h-[min(52vh,420px)] overflow-hidden p-0 bg-black",
  videoClassName: "h-full w-full object-cover",
  previewClassName: "h-full w-full object-contain",
  compactFrameClassName:
    "mx-auto mb-4 aspect-[4/3] w-full max-w-xs overflow-hidden p-0 bg-black sm:max-w-sm",
};

/** Попова, Рамеева: камера смонтирована с поворотом, снимок 9:16, +90° по часовой. */
const PORTRAIT_KIOSK_LAYOUT: KioskCameraLayout = {
  rotationCw: 90,
  photoAspectRatio: 9 / 16,
  frameClassName:
    "relative aspect-[9/16] w-full max-w-sm max-h-[min(80vh,720px)] overflow-hidden p-0 bg-black",
  videoClassName:
    "absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rotate-90 object-contain",
  previewClassName: "h-full w-full object-contain",
  compactFrameClassName:
    "mx-auto mb-4 aspect-[9/16] w-full max-w-xs overflow-hidden p-0 bg-black sm:max-w-sm",
};

const PORTRAIT_KIOSK_IDS: KioskId[] = ["Popova", "Rameeva"];

export function getKioskCameraLayout(kioskId: KioskId | null): KioskCameraLayout {
  if (kioskId && PORTRAIT_KIOSK_IDS.includes(kioskId)) return PORTRAIT_KIOSK_LAYOUT;
  return DEFAULT_LAYOUT;
}
