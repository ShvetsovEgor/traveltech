const ARTIST_SKETCH_KEY = "traveltech_artist_sketch";
const ARTIST_SKETCH_STYLE_KEY = "traveltech_artist_sketch_style";

/** Набросок для ИИ-творца между экранами sketch → loading. */
export function setPendingArtistSketch(dataUrl: string, style: string): void {
  sessionStorage.setItem(ARTIST_SKETCH_KEY, dataUrl);
  sessionStorage.setItem(ARTIST_SKETCH_STYLE_KEY, style);
}

export function getPendingArtistSketchDataUrl(): string | null {
  return sessionStorage.getItem(ARTIST_SKETCH_KEY);
}

export function getPendingArtistSketchStyle(): string | null {
  return sessionStorage.getItem(ARTIST_SKETCH_STYLE_KEY);
}

export function clearPendingArtistSketch(): void {
  sessionStorage.removeItem(ARTIST_SKETCH_KEY);
  sessionStorage.removeItem(ARTIST_SKETCH_STYLE_KEY);
}
