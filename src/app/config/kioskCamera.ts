import type { KioskId } from "../api/types";

/** Поворот кадра по часовой при съёмке и в превью (градусы). */
export type CameraRotationCw = 0 | 90 | 180 | 270;

export type KioskCameraLayout = {
  rotationCw: CameraRotationCw;
  /** Fallback aspect ratio до загрузки метаданных потока. */
  photoAspectRatio: number;
  frameClassName: string;
  /** CSS width рамки с учётом max-height (чтобы превью не сжималось после съёмки). */
  frameWidth: string;
  frameMaxHeight: string;
  videoClassName: string;
  previewClassName: string;
  compactFrameClassName: string;
};

const DEFAULT_LAYOUT: KioskCameraLayout = {
  rotationCw: 0,
  photoAspectRatio: 4 / 3,
  frameClassName:
    "@container relative mx-auto shrink-0 overflow-hidden rounded-3xl border border-white/40 bg-black shadow-md",
  frameWidth: "min(100%, calc(min(52vh, 420px) * 4 / 3))",
  frameMaxHeight: "min(52vh, 420px)",
  videoClassName: "absolute inset-0 size-full",
  previewClassName: "absolute inset-0 size-full object-cover",
  compactFrameClassName:
    "@container mx-auto mb-4 w-full max-w-xs overflow-hidden rounded-2xl bg-black sm:max-w-sm",
};

/**
 * Попова: камера повёрнута на 90°.
 * Рамка подстраивается под videoWidth/videoHeight; видео без object-cover.
 */
const PORTRAIT_KIOSK_LAYOUT: KioskCameraLayout = {
  rotationCw: 90,
  photoAspectRatio: 9 / 16,
  frameClassName:
    "@container relative mx-auto shrink-0 overflow-hidden rounded-3xl border border-white/40 bg-black shadow-md",
  frameWidth: "min(100%, calc(min(80vh, 720px) * 9 / 16))",
  frameMaxHeight: "min(80vh, 720px)",
  videoClassName:
    "absolute left-1/2 top-1/2 h-[100cqw] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90",
  previewClassName: "absolute inset-0 size-full object-cover",
  compactFrameClassName:
    "@container mx-auto mb-4 w-full max-w-xs overflow-hidden rounded-2xl bg-black sm:max-w-sm",
};

/** Рамеева: как Попова (90°) + ещё 180° — итого 270°, камера была вверх ногами. */
const RAMEEVA_KIOSK_LAYOUT: KioskCameraLayout = {
  ...PORTRAIT_KIOSK_LAYOUT,
  rotationCw: 270,
  videoClassName:
    "absolute left-1/2 top-1/2 h-[100cqw] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 rotate-270",
};

export function getKioskCameraLayout(kioskId: KioskId | null): KioskCameraLayout {
  if (kioskId === "Rameeva") return RAMEEVA_KIOSK_LAYOUT;
  if (kioskId === "Popova") return PORTRAIT_KIOSK_LAYOUT;
  return DEFAULT_LAYOUT;
}
