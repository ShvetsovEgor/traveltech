/** Набросок для ИИ-творца между экранами sketch → loading (в памяти вкладки). */
let pendingSketch: File | null = null;

export function setPendingArtistSketch(file: File): void {
  pendingSketch = file;
}

export function getPendingArtistSketch(): File | null {
  return pendingSketch;
}

/** @deprecated Используйте getPendingArtistSketch — не снимайте файл при рендере */
export function takePendingArtistSketch(): File | null {
  return getPendingArtistSketch();
}

export function clearPendingArtistSketch(): void {
  pendingSketch = null;
}
