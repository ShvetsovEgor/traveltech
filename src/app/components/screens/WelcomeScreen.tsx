import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Sparkles, Lock } from "lucide-react";
import {
  Alert,
  Card,
  Chip,
  Typography,
  cn,
} from "@heroui/react";
import {
  useKiosk,
  useKioskActivationPoll,
} from "../../context/KioskContext";
import {
  INTERACTIVE_ITEMS,
  KIOSK_DISPLAY_NAMES,
} from "../../config/kiosk";
import type { InteractiveItem } from "../../config/kiosk";
import { buildGuideAuthUrl, getKioskIdFromSearch } from "../../utils/kioskLocation";
import type { KioskId } from "../../api/types";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, kioskId, applyRemoteAuth, ensureInteraction } =
    useKiosk();

  const locationFromUrl = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()),
    [searchParams]
  );
  const effectiveKioskId = locationFromUrl ?? kioskId;

  const [justActivated, setJustActivated] = useState(false);

  const authQrUrl = useMemo(
    () => (effectiveKioskId ? buildGuideAuthUrl(effectiveKioskId) : ""),
    [effectiveKioskId]
  );

  const handleActivated = useCallback(
    (token: string, id: KioskId) => {
      applyRemoteAuth(token, id);
      setJustActivated(true);
    },
    [applyRemoteAuth]
  );

  useKioskActivationPoll(
    effectiveKioskId,
    Boolean(effectiveKioskId) && !isAuthenticated,
    handleActivated
  );

  const handleInteractive = async (item: InteractiveItem) => {
    if (!isAuthenticated) return;
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
        <Typography.Heading level={1} className="text-4xl text-accent-foreground mb-4">
          TravelTech
        </Typography.Heading>
        <Typography.Paragraph className="text-xl text-accent-foreground/80 text-center max-w-lg">
          Укажите киоск в адресе:{" "}
          <Typography.Code className="bg-accent-foreground/20 px-2 py-1 rounded">
            ?location=Popova
          </Typography.Code>
        </Typography.Paragraph>
      </KioskScreen>
    );
  }

  const isActive = isAuthenticated;

  return (
    <KioskScreen
      className="bg-gradient-to-br from-accent via-accent/90 to-accent"
      contentClassName="max-w-6xl mx-auto"
    >
      <KioskHeader
        title="TravelTech"
        subtitle={
          isActive
            ? justActivated
              ? "Киоск активирован — выберите интерактив"
              : "Выберите интерактив"
            : "Отсканируйте QR-код и введите PIN на телефоне"
        }
        icon={<Sparkles className="size-16 text-accent-foreground" />}
        className="[&_h1]:text-accent-foreground [&_p]:text-accent-foreground/75"
      />

      <Chip className="mx-auto mb-8 flex w-fit items-center gap-2 bg-accent-foreground/15 text-accent-foreground px-5 py-2">
        <MapPin className="size-5" />
        <Chip.Label>Точка: {KIOSK_DISPLAY_NAMES[effectiveKioskId]}</Chip.Label>
      </Chip>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {!isActive && authQrUrl && (
          <Card className="p-8 flex flex-col items-center">
            <Card.Title className="text-2xl text-accent mb-2 text-center">
              Авторизация гида
            </Card.Title>
            <Card.Description className="text-center mb-6 max-w-xs">
              Наведите камеру на QR-код, откройте ссылку в браузере и введите PIN
            </Card.Description>
            <QRCodeSVG
              value={authQrUrl}
              size={240}
              level="H"
              fgColor="oklch(0.38 0.14 285)"
            />
            <Typography.Paragraph className="text-xs text-muted mt-4 break-all text-center max-w-xs">
              {authQrUrl}
            </Typography.Paragraph>
            <Typography.Paragraph className="mt-6 text-accent font-medium animate-pulse">
              Ожидаем вход гида…
            </Typography.Paragraph>
          </Card>
        )}

        {isActive && (
          <Alert status="success" className="border border-success/40">
            <Alert.Content>
              <Alert.Title className="text-2xl">Киоск активен</Alert.Title>
              <Alert.Description>Можно начинать работу с гостями</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-4",
            isActive && "lg:col-span-2"
          )}
        >
          {INTERACTIVE_ITEMS.map((item) => (
            <div key={item.path} className="relative">
              {!isActive && (
                <Lock className="absolute top-4 right-4 z-10 size-5 text-muted" />
              )}
              <SelectionCard
                title={item.title}
                description={item.description}
                icon={item.icon}
                disabled={!isActive}
                onPress={() => handleInteractive(item)}
                className={cn(!isActive && "opacity-60")}
              />
            </div>
          ))}
        </div>
      </div>
    </KioskScreen>
  );
}
