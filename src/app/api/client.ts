import type {
  AppType,
  GenerateTaskResponse,
  InteractionStartResponse,
  KioskId,
  KioskStatusResponse,
  LoginResponse,
  TaskStatusResponse,
  DashboardResponse,
} from "./types";
import { buildApiUrl } from "./resolveApiBase";

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
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
    if (res.status === 401) {
      sessionStorage.removeItem("traveltech_kiosk_token");
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  login(pin: string, kioskId: KioskId) {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, kiosk_id: kioskId }),
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
