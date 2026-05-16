import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Card, Input, Label, Spinner, Typography } from "@heroui/react";
import { CheckCircle2, MapPin } from "lucide-react";
import { useKiosk } from "../../context/KioskContext";
import { KIOSK_DISPLAY_NAMES } from "../../config/kiosk";
import { getKioskIdFromSearch } from "../../utils/kioskLocation";
import { KioskScreen } from "../kiosk";

export function GuideAuthScreen() {
  const [searchParams] = useSearchParams();
  const { login } = useKiosk();
  const kioskId = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()),
    [searchParams]
  );

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!kioskId) {
    return (
      <KioskScreen className="items-center justify-center">
        <Typography.Paragraph className="text-center text-lg max-w-md">
          Неверная ссылка. Нужен параметр{" "}
          <Typography.Code>?location=Popova</Typography.Code>
        </Typography.Paragraph>
      </KioskScreen>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(pin, kioskId);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <KioskScreen className="items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="size-20 text-success mx-auto mb-6" />
          <Card.Title className="text-3xl mb-3">Киоск активирован</Card.Title>
          <Card.Description className="text-lg">
            Точка <strong>{KIOSK_DISPLAY_NAMES[kioskId]}</strong> готова к работе.
            Вернитесь к экрану киоска.
          </Card.Description>
        </Card>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen className="items-center justify-center">
      <Card className="max-w-md w-full p-8 shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-center gap-2 text-accent mb-6">
            <MapPin className="size-6" />
            <span className="text-xl font-medium">
              {KIOSK_DISPLAY_NAMES[kioskId]}
            </span>
          </div>

          <Card.Title className="text-3xl text-center mb-2">Вход гида</Card.Title>
          <Card.Description className="text-center mb-8">
            Введите PIN для активации киоска
          </Card.Description>

          <Label className="mb-2 block">PIN</Label>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={12}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mb-4 text-center text-2xl tracking-widest"
            placeholder="••••"
            autoFocus
            fullWidth
          />

          {error && (
            <Typography.Paragraph className="text-danger text-center mb-4 text-sm">
              {error}
            </Typography.Paragraph>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isDisabled={loading || pin.length < 4}
          >
            {loading ? (
              <>
                <Spinner size="sm" color="current" />
                Проверка...
              </>
            ) : (
              "Активировать киоск"
            )}
          </Button>
        </form>
      </Card>
    </KioskScreen>
  );
}
