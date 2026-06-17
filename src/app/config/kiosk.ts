import type { AppType, KioskId } from "../api/types";
import { Box, Gamepad2, Palette, Smile, Video, type LucideIcon } from "lucide-react";

export const KIOSK_DISPLAY_NAMES: Record<KioskId, string> = {
  Popova: "Попова",
  Lobachevsky: "Лобачевского",
  robot: "Робот",
  Rameeva: "ИТ-парк Рамеева",
};

export type InteractiveItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  appType?: AppType;
};

export const INTERACTIVE_ITEMS: InteractiveItem[] = [
  {
    title: "ИИ-творец",
    description: "Картина в стиле великих художников",
    icon: Palette,
    path: "/neural-artist",
    appType: "neuro_artist",
  },
  {
    title: "Нейростилист",
    description: "Стилизация лица в разных образах",
    icon: Box,
    path: "/neural-box",
    appType: "neurobox",
  },
  {
    title: "Оживление видео",
    description: "Фото превращается в видео",
    icon: Video,
    path: "/video-animation",
    appType: "video_magic",
  },
  {
    title: "Стикерпак",
    description: "4 эмоции по вашему фото",
    icon: Smile,
    path: "/sticker-pack",
    appType: "sticker_pack",
  },
  {
    title: "Мини-игры",
    description: "Миссия Мин-Тимера",
    icon: Gamepad2,
    path: "/mini-games",
  },
];
