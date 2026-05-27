import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Chip, Typography } from "@heroui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, resolveMediaUrl } from "../../api/client";
import type { DashboardMediaItem, DashboardResponse } from "../../api/types";
import { KIOSK_DISPLAY_NAMES } from "../../config/kiosk";
import { KioskScreen } from "../kiosk";

const APP_TYPE_LABELS: Record<string, string> = {
  neuro_artist: "ИИ-творец",
  neurobox: "Нейростилист",
  video_magic: "Оживление видео",
};

function fmtHour(iso: string): string {
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, "0")}:00`;
}

function fmtDateTime(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MediaGalleryItem({ item }: { item: DashboardMediaItem }) {
  const url = resolveMediaUrl(item.result_url);
  const label = APP_TYPE_LABELS[item.app_type] ?? item.app_type;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black/20">
      <div className="aspect-[3/4] w-full bg-black">
        {item.type === "video" ? (
          <video
            src={url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <img
            src={url}
            alt={label}
            className="h-full w-full object-contain"
            loading="lazy"
            draggable={false}
          />
        )}
      </div>
      <div className="space-y-1 p-2">
        <Typography.Paragraph className="text-xs font-medium">{label}</Typography.Paragraph>
        <Typography.Paragraph className="text-[10px] text-muted-foreground">
          {fmtDateTime(item.at_msk)}
        </Typography.Paragraph>
      </div>
    </div>
  );
}

export function GenerationsDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.getDashboard();
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить дашборд");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const hourSeries = useMemo(
    () =>
      (data?.dashboard.generations.series.by_hour ?? []).map((x) => ({
        ...x,
        label: fmtHour(x.at_msk),
      })),
    [data]
  );

  const daySeries = data?.dashboard.generations.series.by_day ?? [];
  const kiosks = data?.dashboard.kiosks ?? [];
  const recentMedia = data?.dashboard.generations.recent_media ?? [];

  return (
    <KioskScreen
      className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
      contentClassName="mx-auto min-h-0 w-full max-w-7xl overflow-y-auto !p-4 sm:!p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Heading level={1} className="text-white">
            Dashboard генераций
          </Typography.Heading>
          <Typography.Paragraph className="text-white/70">
            Сервер: {data?.status ?? "—"} | Время MSK: {data?.server_time_msk ?? "—"}
          </Typography.Paragraph>
        </div>
        <Chip className="bg-emerald-500/20 text-emerald-100">
          <Chip.Label>{loading ? "Загрузка..." : "Обновление каждые 15с"}</Chip.Label>
        </Chip>
      </div>

      {error && (
        <Alert status="danger" className="mb-4">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <Typography.Paragraph className="text-sm text-muted-foreground">Всего</Typography.Paragraph>
          <Typography.Heading level={2}>{data?.dashboard.generations.total ?? 0}</Typography.Heading>
        </Card>
        <Card className="p-4">
          <Typography.Paragraph className="text-sm text-muted-foreground">Фото</Typography.Paragraph>
          <Typography.Heading level={2}>{data?.dashboard.generations.photo ?? 0}</Typography.Heading>
        </Card>
        <Card className="p-4">
          <Typography.Paragraph className="text-sm text-muted-foreground">Видео</Typography.Paragraph>
          <Typography.Heading level={2}>{data?.dashboard.generations.video ?? 0}</Typography.Heading>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="p-4">
            <Typography.Paragraph className="mb-3 text-sm text-muted-foreground">
              По часам (последние 48)
            </Typography.Paragraph>
            <div className="h-72 w-full overflow-x-auto">
              <LineChart width={600} height={280} data={hourSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="photo" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="video" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </div>
          </Card>

          <Card className="p-4">
            <Typography.Paragraph className="mb-3 text-sm text-muted-foreground">
              По дням (последние 30)
            </Typography.Paragraph>
            <div className="h-72 w-full overflow-x-auto">
              <BarChart width={600} height={280} data={daySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date_msk" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="photo" fill="#22c55e" />
                <Bar dataKey="video" fill="#3b82f6" />
              </BarChart>
            </div>
          </Card>

          <Card className="p-4">
            <Typography.Paragraph className="mb-3 text-sm text-muted-foreground">
              Последние генерации ({recentMedia.length})
            </Typography.Paragraph>
            {recentMedia.length === 0 ? (
              <Typography.Paragraph className="text-sm text-muted-foreground">
                Пока нет завершённых генераций в логах.
              </Typography.Paragraph>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {recentMedia.map((item) => (
                  <MediaGalleryItem key={item.task_id} item={item} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
          <Typography.Paragraph className="mb-3 text-sm text-muted-foreground">
            Статусы киосков
          </Typography.Paragraph>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {kiosks.map((kiosk) => (
              <div key={kiosk.kiosk_id} className="rounded-xl border border-border p-3">
                <Typography.Paragraph className="font-medium">
                  {KIOSK_DISPLAY_NAMES[kiosk.kiosk_id]}
                </Typography.Paragraph>
                <Chip className={kiosk.active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-200"}>
                  <Chip.Label>{kiosk.status}</Chip.Label>
                </Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </KioskScreen>
  );
}
