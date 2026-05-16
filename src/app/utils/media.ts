export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
  mime = "image/jpeg"
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: mime });
}

export function captureVideoFrameAsDataUrl(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
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
