import type {
  AppType,
  GenerateTaskResponse,
  GuideAgencyId,
  InteractionStartResponse,
  KioskId,
  KioskStatusResponse,
  KioskValidateResponse,
  LoginResponse,
  TaskStatusResponse,
  DashboardResponse,
} from "./types";
import { buildApiUrl } from "./resolveApiBase";

let kioskUnauthorizedHandler: (() => void) | null = null;
let interactionExpiredHandler: (() => void) | null = null;

/** Сброс kiosk_token в React-состоянии при 401 сессии гида (см. KioskProvider). */
export function setKioskUnauthorizedHandler(handler: (() => void) | null) {
  kioskUnauthorizedHandler = handler;
}

/** Сброс только interaction_token — протухла локальная сессия приложения. */
export function setInteractionExpiredHandler(handler: (() => void) | null) {
  interactionExpiredHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

const INTERACTION_ONLY_PATHS = new Set([
  "/api/interaction/heartbeat",
  "/api/artist/generate",
  "/api/neurobox/generate",
  "/api/sticker-pack/generate",
  "/api/video/generate",
]);

function isInteractionAuthError(path: string, detail: string): boolean {
  if (INTERACTION_ONLY_PATHS.has(path)) return true;
  const lowered = detail.toLowerCase();
  return (
    lowered.includes("interaction_token") ||
    lowered.includes("interaction token") ||
    lowered.includes("not for neurobox") ||
    lowered.includes("not for neuro_artist") ||
    lowered.includes("not for video") ||
    lowered.includes("not for sticker")
  );
}

function shouldClearKioskAuth(status: number, path: string, detail: string): boolean {
  if (status !== 401 || path === "/api/auth/login") return false;
  if (isInteractionAuthError(path, detail)) return false;
  if (path.startsWith("/api/tasks/")) return false;
  return true;
}

function shouldClearInteraction(status: number, path: string, detail: string): boolean {
  if (status !== 401) return false;
  return isInteractionAuthError(path, detail);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      const raw = body.detail;
      detail = Array.isArray(raw)
        ? raw.map((x: { msg?: string }) => x.msg ?? "").join(", ")
        : raw ?? detail;
    } catch {
      /* ignore */
    }
    const message = typeof detail === "string" ? detail : "Request failed";

    if (shouldClearInteraction(res.status, path, message)) {
      interactionExpiredHandler?.();
    } else if (shouldClearKioskAuth(res.status, path, message)) {
      sessionStorage.removeItem("traveltech_kiosk_token");
      kioskUnauthorizedHandler?.();
    }

    throw new ApiError(message, res.status, path);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(pin: string, kioskId: KioskId, agencyId: GuideAgencyId = "traveltech") {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, kiosk_id: kioskId, agency_id: agencyId }),
    });
  },

  logout(kioskToken: string) {
    return request<{ ok: boolean; kiosk_id: KioskId }>("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kiosk_token: kioskToken }),
    });
  },

  getKioskStatus(kioskId: KioskId) {
    return request<KioskStatusResponse>(
      `/api/auth/status?kiosk_id=${encodeURIComponent(kioskId)}`
    );
  },

  validateKioskToken(kioskToken: string) {
    return request<KioskValidateResponse>(
      `/api/auth/validate?kiosk_token=${encodeURIComponent(kioskToken)}`
    );
  },

  startInteraction(kioskToken: string, appType: AppType) {
    return request<InteractionStartResponse>("/api/interaction/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kiosk_token: kioskToken, app_type: appType }),
    });
  },

  heartbeat(interactionToken: string) {
    return request<{ interaction_token: string; last_active_time_msk: string }>(
      "/api/interaction/heartbeat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interaction_token: interactionToken }),
      }
    );
  },

  artistGenerate(sketch: File, styleId: string, interactionToken: string) {
    const form = new FormData();
    form.append("sketch", sketch);
    form.append("style_id", styleId);
    form.append("interaction_token", interactionToken);
    return request<GenerateTaskResponse>("/api/artist/generate", {
      method: "POST",
      body: form,
    });
  },

  neuroboxGenerate(
    photo: File,
    styleId: string,
    interactionToken: string,
    options: string[],
    gender?: string
  ) {
    const form = new FormData();
    form.append("photo", photo);
    form.append("style_id", styleId);
    form.append("interaction_token", interactionToken);
    form.append("options", JSON.stringify(options));
    if (gender) form.append("gender", gender);
    return request<GenerateTaskResponse>("/api/neurobox/generate", {
      method: "POST",
      body: form,
    });
  },

  stickerPackGenerate(photo: File, interactionToken: string) {
    const form = new FormData();
    form.append("photo", photo);
    form.append("interaction_token", interactionToken);
    return request<GenerateTaskResponse>("/api/sticker-pack/generate", {
      method: "POST",
      body: form,
    });
  },

  videoGenerate(
    photo: File,
    scenarioId: string,
    interactionToken: string,
    options: string[]
  ) {
    const form = new FormData();
    form.append("photo", photo);
    form.append("scenario_id", scenarioId);
    form.append("interaction_token", interactionToken);
    form.append("options", JSON.stringify(options));
    return request<GenerateTaskResponse>("/api/video/generate", {
      method: "POST",
      body: form,
    });
  },

  getTaskStatus(taskId: string) {
    return request<TaskStatusResponse>(`/api/tasks/${taskId}/status`);
  },

  getDashboard() {
    return request<DashboardResponse>("/api/dashboard");
  },
};

/** Обложки /static/* и result_url с бэкенда (на проде — Render, не хост фронта). */
export function assetUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return buildApiUrl(path);
}

export function resolveMediaUrl(url: string): string {
  return assetUrl(url);
}
