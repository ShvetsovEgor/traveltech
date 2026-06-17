import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { MapPin, Sparkles } from "lucide-react";
import { Chip, Typography } from "@heroui/react";
import { useKiosk } from "../../context/KioskContext";
import {
  INTERACTIVE_ITEMS,
  KIOSK_DISPLAY_NAMES,
} from "../../config/kiosk";
import type { InteractiveItem } from "../../config/kiosk";
import { getKioskIdFromSearch } from "../../utils/kioskLocation";
import { InteractiveStrip, KioskScreen, NetworkStatusLine, TravelTechHeading } from "../kiosk";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { kioskId, ensureInteraction } = useKiosk();

  const locationFromUrl = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()),
    [searchParams]
  );
  const effectiveKioskId = locationFromUrl ?? kioskId;

  const handleInteractive = async (item: InteractiveItem) => {
    if (item.appType) {
      try {
        await ensureInteraction(item.appType);
      } catch {
        return;
      }
    }
    navigate(item.path);
  };

  if (!effectiveKioskId) {
    return (
      <KioskScreen
        className="items-center justify-center bg-accent"
        contentClassName="flex items-center justify-center"
      >
        <TravelTechHeading className="mb-4 text-3xl text-accent-foreground sm:text-4xl" />
        <Typography.Paragraph className="max-w-lg text-center text-lg text-accent-foreground/90 sm:text-xl">
          Укажите киоск в адресе:{" "}
          <Typography.Code className="rounded bg-accent-foreground/20 px-2 py-1">
            ?location=Popova
          </Typography.Code>
        </Typography.Paragraph>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen
      className="overflow-hidden bg-gradient-to-br from-accent via-primary to-accent"
      contentClassName="flex h-full min-h-0 max-w-4xl flex-col gap-1 !p-3 sm:!p-4 md:!p-5"
    >
      <header className="shrink-0 text-left">
        <div className="flex items-center justify-start gap-2 sm:gap-3">
          <TravelTechHeading className="text-2xl font-bold text-white sm:text-3xl md:text-4xl" />
          <Sparkles
            className="size-7 shrink-0 text-white sm:size-8 md:size-9"
            aria-hidden
          />
        </div>

        <div className="mt-1 flex w-fit flex-col gap-0.5 sm:mt-1.5 sm:gap-1">
          <Chip className="flex w-fit items-center gap-1.5 bg-white/15 px-3 py-1 text-white sm:gap-2 sm:px-3.5">
            <MapPin className="size-3.5 sm:size-4" aria-hidden />
            <Chip.Label className="text-xs sm:text-sm">
              Точка: {KIOSK_DISPLAY_NAMES[effectiveKioskId]}
            </Chip.Label>
          </Chip>
          <NetworkStatusLine className="pl-0.5" />
        </div>

        <Typography.Paragraph className="mt-1 text-sm text-white/85 sm:text-base">
          Выберите интерактив
        </Typography.Paragraph>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-visible sm:gap-2.5">
        {INTERACTIVE_ITEMS.map((item, index) => (
          <InteractiveStrip
            key={item.path}
            compact
            index={index}
            title={item.title}
            description={item.description}
            icon={item.icon}
            onPress={() => handleInteractive(item)}
          />
        ))}
      </div>
    </KioskScreen>
  );
}
