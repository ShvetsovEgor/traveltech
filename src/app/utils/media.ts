/** Минимальный размер JPEG с веб-камеры (заглушка 1×1 ~300 байт). */
export const MIN_PORTRAIT_BYTES = 8_000;
export const MIN_PORTRAIT_SIDE_PX = 200;

export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
  mime = "image/jpeg"
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: mime });
}

export function isVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth >= MIN_PORTRAIT_SIDE_PX &&
    video.videoHeight >= MIN_PORTRAIT_SIDE_PX
  );
}

export function captureVideoFrameAsDataUrl(video: HTMLVideoElement): string | null {
  if (!isVideoFrameReady(video)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function captureVideoFrameAsFile(
  video: HTMLVideoElement,
  filename = "photo.jpg"
): Promise<File | null> {
  const dataUrl = captureVideoFrameAsDataUrl(video);
  if (!dataUrl) return null;
  return dataUrlToFile(dataUrl, filename);
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("invalid image"));
    img.src = url;
  });
}

/** null — ок; строка — сообщение об ошибке для пользователя. */
export async function validatePortraitFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    return "Нужен файл изображения с камеры.";
  }
  if (file.size < MIN_PORTRAIT_BYTES) {
    return "Фото не загрузилось. Разрешите камеру и сделайте снимок ещё раз.";
  }

  const url = URL.createObjectURL(file);
  try {
    const { width, height } = await loadImageDimensions(url);
    if (width < MIN_PORTRAIT_SIDE_PX || height < MIN_PORTRAIT_SIDE_PX) {
      return "Снимок слишком маленький. Подождите, пока камера включится, и сфотографируйтесь снова.";
    }
    return null;
  } catch {
    return "Не удалось прочитать фото. Сделайте снимок ещё раз.";
  } finally {
    URL.revokeObjectURL(url);
  }
}
