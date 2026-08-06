import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Download } from "lucide-react";
import { Button, Typography } from "@heroui/react";
import { resolveMediaUrl } from "../../api/client";
import { KioskBody, KioskHeader, KioskScreen, MediaWithQrOverlay } from "../kiosk";

const ARTIST_RESULT_KEY = "traveltech_artist_result";

type SavedArtistResult = {
  style: string;
  resultUrl: string;
};

function readSavedResult(): SavedArtistResult | null {
  try {
    const raw = sessionStorage.getItem(ARTIST_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedArtistResult;
    return parsed.resultUrl ? parsed : null;
  } catch {
    return null;
  }
}

function writeSavedResult(result: SavedArtistResult | null) {
  if (!result) {
    sessionStorage.removeItem(ARTIST_RESULT_KEY);
    return;
  }
  sessionStorage.setItem(ARTIST_RESULT_KEY, JSON.stringify(result));
}

export function NeuralArtistResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const navStyle = (location.state?.style as string | undefined) || undefined;
  const navResultUrl = location.state?.resultUrl as string | undefined;

  const [style, setStyle] = useState(
    () => navStyle || readSavedResult()?.style || "vangogh"
  );
  const [resultUrl, setResultUrl] = useState<string | null>(
    () => navResultUrl || readSavedResult()?.resultUrl || null
  );

  useEffect(() => {
    if (navResultUrl) {
      const nextStyle = navStyle || "vangogh";
      setStyle(nextStyle);
      setResultUrl(navResultUrl);
      writeSavedResult({ style: nextStyle, resultUrl: navResultUrl });
    }
  }, [navResultUrl, navStyle]);

  if (!resultUrl) {
    return (
      <KioskScreen
        className="items-center justify-center"
        contentClassName="flex items-center justify-center"
      >
        <Button variant="primary" size="lg" onPress={() => navigate("/neural-artist")}>
          Начать заново
        </Button>
      </KioskScreen>
    );
  }

  const imageSrc = resolveMediaUrl(resultUrl);

  return (
    <KioskScreen backTo="/neural-artist">
      <KioskHeader
        compact
        centered={false}
        title="Ваш шедевр готов!"
        icon={<Download />}
      />

      <KioskBody>
        <div className="flex flex-col items-center gap-3">
          <MediaWithQrOverlay
            key={imageSrc}
            url={imageSrc}
            alt={`Результат в стиле ${style}`}
            fallbackAspectRatio={4 / 3}
            hideLoadingOverlay
          />
          <Typography.Paragraph className="text-center text-sm text-muted-foreground">
            Отсканируйте QR-код в углу изображения
          </Typography.Paragraph>
        </div>

        <div className="pt-4 text-center">
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              writeSavedResult(null);
              navigate("/");
            }}
          >
            Вернуться в меню
          </Button>
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
