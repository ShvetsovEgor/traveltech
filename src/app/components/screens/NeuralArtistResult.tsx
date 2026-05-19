import { useNavigate, useLocation } from "react-router";
import { Download } from "lucide-react";
import { Button, Typography } from "@heroui/react";
import { resolveMediaUrl } from "../../api/client";
import { KioskBody, KioskHeader, KioskScreen, MediaWithQrOverlay } from "../kiosk";

export function NeuralArtistResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const style = location.state?.style || "vangogh";
  const resultUrl = location.state?.resultUrl as string | undefined;

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
          <MediaWithQrOverlay url={imageSrc} alt={`Результат в стиле ${style}`} />
          <Typography.Paragraph className="text-center text-sm text-muted-foreground">
            Отсканируйте QR-код в углу изображения
          </Typography.Paragraph>
        </div>

        <div className="pt-4 text-center">
          <Button variant="primary" size="lg" onPress={() => navigate("/")}>
            Вернуться в меню
          </Button>
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
