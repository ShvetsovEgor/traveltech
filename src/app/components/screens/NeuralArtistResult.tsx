import { useNavigate, useLocation } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button, Card, Typography } from "@heroui/react";
import { resolveMediaUrl } from "../../api/client";
import { KioskHeader, KioskScreen } from "../kiosk";

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
        title="Ваш шедевр готов!"
        subtitle="Отсканируйте QR-код для получения изображения"
      />

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-6xl mx-auto">
        <Card className="p-4">
          <img
            src={imageSrc}
            alt={`Результат в стиле ${style}`}
            className="w-full max-w-lg rounded-2xl aspect-square object-cover"
          />
        </Card>

        <Card className="p-8">
          <div className="flex flex-col items-center">
            <Download className="size-12 text-accent mb-4" />
            <Card.Title className="text-2xl mb-4">Скачать результат</Card.Title>
            <QRCodeSVG value={imageSrc} size={256} level="H" fgColor="oklch(0.38 0.14 285)" />
            <Card.Description className="mt-4 text-center max-w-xs">
              Отсканируйте QR-код телефоном
            </Card.Description>
          </div>
        </Card>
      </div>

      <div className="text-center mt-12">
        <Button variant="primary" size="lg" onPress={() => navigate("/menu")}>
          Вернуться в меню
        </Button>
      </div>
    </KioskScreen>
  );
}
