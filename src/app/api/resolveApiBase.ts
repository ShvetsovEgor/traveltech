import {
  PRODUCTION_API_FALLBACK,
  STATIC_FRONTEND_HOSTS,
} from "../config/api";

function normalizeApiBase(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed.replace(/\/+$/, "")}`;
}

/** Dev: "" (Vite proxy). Prod: VITE_API_URL или fallback для missioninnopolis.ru. */
export function resolveApiBase(): string {
  if (import.meta.env.DEV) {
    return "";
  }

  const fromEnv = normalizeApiBase(
    import.meta.env.VITE_API_URL as string | undefined
  );
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if ((STATIC_FRONTEND_HOSTS as readonly string[]).includes(host)) {
      return PRODUCTION_API_FALLBACK;
    }
  }

  return "";
}

export function buildApiUrl(path: string): string {
  const base = resolveApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
