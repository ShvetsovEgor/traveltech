import { useNavigate } from "react-router";
import { Palette, Box, Video, Gamepad2 } from "lucide-react";
import { useKiosk } from "../../context/KioskContext";
import type { AppType } from "../../api/types";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

const menuItems: {
  title: string;
  description: string;
  icon: typeof Palette;
  path: string;
  appType?: AppType;
}[] = [
  {
    title: "Нейрохудожник",
    description: "Создайте картину в стиле великих художников",
    icon: Palette,
    path: "/neural-artist",
    appType: "neuro_artist",
  },
  {
    title: "Нейробокс",
    description: "Преобразите своё лицо в разных стилях",
    icon: Box,
    path: "/neural-box",
    appType: "neurobox",
  },
  {
    title: "Оживление видео",
    description: "Оживите фотографию в видео",
    icon: Video,
    path: "/video-animation",
    appType: "video_magic",
  },
  {
    title: "Мини-игры",
    description: "Змейка, тетрис и ровер",
    icon: Gamepad2,
    path: "/mini-games",
  },
];

export function MainMenu() {
  const navigate = useNavigate();
  const { ensureInteraction, isAuthenticated, clearInteraction } = useKiosk();

  const handleNavigate = async (item: (typeof menuItems)[0]) => {
    if (item.appType) {
      if (!isAuthenticated) {
        navigate("/");
        return;
      }
      try {
        await ensureInteraction(item.appType);
      } catch {
        navigate("/");
        return;
      }
    } else {
      clearInteraction();
    }
    navigate(item.path);
  };

  return (
    <KioskScreen>
      <KioskHeader
        title="TravelTech"
        subtitle="Выберите интерактив"
        centered={false}
        className="pt-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-6xl">
        {menuItems.map((item) => (
          <SelectionCard
            key={item.path}
            title={item.title}
            description={item.description}
            icon={item.icon}
            onPress={() => handleNavigate(item)}
          />
        ))}
      </div>
    </KioskScreen>
  );
}
