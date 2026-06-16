import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { MapPin } from "lucide-react";
import { Card, Chip, Typography, cn } from "@heroui/react";
import { useKiosk } from "../../context/KioskContext";
import { KIOSK_DISPLAY_NAMES } from "../../config/kiosk";
import { useDoubleTapAction } from "../../hooks/useDoubleTap";
import { useFullscreen } from "../../hooks/useFullscreen";
import { buildGuideAuthUrl, getKioskIdFromSearch } from "../../utils/kioskLocation";
import { KioskScreen, NetworkStatusLine } from "../kiosk";

type GuideKioskQrScreenProps = {
  onScreenTap?: () => void;
};

export function GuideKioskQrScreen({ onScreenTap }: GuideKioskQrScreenProps) {
  const [searchParams] = useSearchParams();
  const { kioskId } = useKiosk();

  const effectiveKioskId = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()) ?? kioskId,
    [searchParams, kioskId]
  );

  const authQrUrl = useMemo(
    () => (effectiveKioskId ? buildGuideAuthUrl(effectiveKioskId) : ""),
    [effectiveKioskId]
  );

  const { supported: fullscreenSupported, toggle: toggleFullscreen } =
    useFullscreen();
  const handleTravelTechDoubleTap = useDoubleTapAction(() => {
    void toggleFullscreen();
  });

  if (!effectiveKioskId) {
    return (
      <KioskScreen
        className="bg-gradient-to-br from-accent via-primary to-accent"
        contentClassName="flex items-center justify-center"
      >
        <Typography.Paragraph className="max-w-md text-center text-lg text-white/90">
          Укажите киоск в адресе:{" "}
          <Typography.Code className="rounded bg-white/20 px-2 py-1">
            ?location=Popova
          </Typography.Code>
        </Typography.Paragraph>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen
      className="cursor-pointer overflow-x-hidden overflow-y-auto bg-gradient-to-br from-accent via-primary to-accent"
      contentClassName="relative flex min-h-full w-full max-w-lg flex-col items-center justify-center !p-4 sm:!p-6"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer border-0 bg-transparent"
        aria-label="Вернуться к рекламе"
        onClick={onScreenTap}
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-4 pointer-events-none sm:gap-5">
        <header className="w-full text-center">
          <Typography.Heading
            level={1}
            className="pointer-events-auto inline-block select-none text-2xl font-bold text-white sm:text-3xl"
            {...(fullscreenSupported
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  "aria-label": "Двойное нажатие: полноэкранный режим",
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleTravelTechDoubleTap();
                  },
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTravelTechDoubleTap();
                    }
                  },
                }
              : {})}
          >
            TravelTech
          </Typography.Heading>
          <div className="mx-auto mt-2 flex w-fit flex-col items-center gap-1">
            <Chip className="flex w-fit items-center gap-2 bg-white/15 px-4 py-1.5 text-white">
              <MapPin className="size-4" aria-hidden />
              <Chip.Label className="text-sm">
                Точка: {KIOSK_DISPLAY_NAMES[effectiveKioskId]}
              </Chip.Label>
            </Chip>
            <NetworkStatusLine />
          </div>
        </header>

        <Card className="w-full max-w-sm p-5 shadow-xl sm:p-8">
          <Card.Title className="mb-1 text-center text-xl text-foreground sm:text-2xl">
            Авторизация гида
          </Card.Title>
          <Card.Description className="mb-5 text-center text-sm text-muted-foreground sm:text-base">
            Отсканируйте QR-код телефоном, откройте ссылку и введите PIN
          </Card.Description>

          {authQrUrl && (
            <div className="flex justify-center">
              <QRCodeSVG
                value={authQrUrl}
                size={220}
                level="H"
                fgColor="#3d2f87"
                className="h-auto w-[min(220px,70vw)]"
              />
            </div>
          )}

          <Typography.Paragraph className="mt-4 break-all text-center text-[10px] text-muted-foreground sm:text-xs">
            {authQrUrl}
          </Typography.Paragraph>

          <Typography.Paragraph
            className={cn(
              "mt-5 text-center text-sm font-medium text-primary sm:text-base",
              "animate-pulse"
            )}
          >
            Ожидаем вход гида…
          </Typography.Paragraph>
        </Card>

        <p className="text-center text-xs text-white/60 sm:text-sm">
          Нажмите на экран, чтобы вернуться к рекламе
        </p>
      </div>
    </KioskScreen>
  );
}
