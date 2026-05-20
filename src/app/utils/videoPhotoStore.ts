import { dataUrlToFile } from "./media";

const STORAGE_KEY = "traveltech_video_magic_photo";

export function saveVideoPhotoDataUrl(dataUrl: string): void {
  sessionStorage.setItem(STORAGE_KEY, dataUrl);
}

export function clearVideoPhotoDataUrl(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function loadVideoPhotoFile(): Promise<File | null> {
  const dataUrl = sessionStorage.getItem(STORAGE_KEY);
  if (!dataUrl) return null;
  try {
    return await dataUrlToFile(dataUrl, "photo.jpg");
  } catch {
    return null;
  }
}
