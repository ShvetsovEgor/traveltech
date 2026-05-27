export type KioskId = "Popova" | "Lobachevsky" | "robot" | "Rameeva";

export type AppType = "neuro_artist" | "neurobox" | "video_magic";

export type TaskStatus = "processing" | "completed" | "failed" | "cancelled";

export interface LoginResponse {
  kiosk_token: string;
  kiosk_id: KioskId;
  expires_at_msk: string;
}

export interface KioskStatusResponse {
  active: boolean;
  kiosk_id: KioskId;
  kiosk_token: string | null;
  expires_at_msk: string | null;
}

export interface InteractionStartResponse {
  interaction_token: string;
  app_type: AppType;
  last_active_time_msk: string;
}

export interface GenerateTaskResponse {
  task_id: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  result_url: string | null;
  error_message: string | null;
  updated_at_msk: string | null;
}

export interface DashboardSeriesPointHour {
  at_msk: string;
  photo: number;
  video: number;
  total: number;
}

export interface DashboardSeriesPointDay {
  date_msk: string;
  photo: number;
  video: number;
  total: number;
}

export interface DashboardMediaItem {
  at_msk: string;
  type: "photo" | "video" | string;
  app_type: AppType | string;
  task_id: string;
  result_url: string;
}

export interface GenerationDashboard {
  total: number;
  photo: number;
  video: number;
  last_events: DashboardMediaItem[];
  recent_media: DashboardMediaItem[];
  series: {
    by_hour: DashboardSeriesPointHour[];
    by_day: DashboardSeriesPointDay[];
  };
}

export interface KioskDashboardStatus {
  kiosk_id: KioskId;
  status: "Waiting" | "Active";
  active: boolean;
  expires_at_msk: string | null;
}

export interface DashboardResponse {
  status: string;
  server_time_msk: string;
  dashboard: {
    generations: GenerationDashboard;
    kiosks: KioskDashboardStatus[];
  };
}
