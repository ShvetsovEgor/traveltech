import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Card, Input, Label, Spinner, Typography } from "@heroui/react";
import { CheckCircle2, MapPin } from "lucide-react";
import { useKiosk } from "../../context/KioskContext";
import { KIOSK_DISPLAY_NAMES } from "../../config/kiosk";
import {
  DEFAULT_GUIDE_AGENCY,
  GUIDE_AGENCIES,
} from "../../config/guideAgencies";
import type { GuideAgencyId, KioskId } from "../../api/types";
import { getKioskIdFromSearch } from "../../utils/kioskLocation";
import { KioskScreen } from "../kiosk";

const GUIDE_AUTH_SUCCESS_KEY = "traveltech_guide_auth_success";

function readGuideAuthSuccess(kioskId: KioskId | null): boolean {
  if (!kioskId) return false;
  return sessionStorage.getItem(GUIDE_AUTH_SUCCESS_KEY) === kioskId;
}

function writeGuideAuthSuccess(kioskId: KioskId) {
  sessionStorage.setItem(GUIDE_AUTH_SUCCESS_KEY, kioskId);
}

export function GuideAuthScreen() {
  const [searchParams] = useSearchParams();
  const { login } = useKiosk();
  const kioskId = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()),
    [searchParams]
  );

  const [agencyId, setAgencyId] = useState<GuideAgencyId>(DEFAULT_GUIDE_AGENCY);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(() => readGuideAuthSuccess(kioskId));

  if (success && kioskId) {
    return (
      <KioskScreen contentClassName="flex items-center justify-center">
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

  if (!kioskId) {
    return (
      <KioskScreen contentClassName="flex items-center justify-center">
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
      await login(pin, kioskId, agencyId);
      writeGuideAuthSuccess(kioskId);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KioskScreen contentClassName="flex items-center justify-center">
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
            Выберите агентство и введите PIN
          </Card.Description>

          <Label className="mb-2 block" htmlFor="guide-agency">
            Агентство
          </Label>
          <select
            id="guide-agency"
            value={agencyId}
            onChange={(e) => {
              setAgencyId(e.target.value as GuideAgencyId);
              setError(null);
            }}
            className="mb-4 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {GUIDE_AGENCIES.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.label}
              </option>
            ))}
          </select>

          <Label className="mb-2 block" htmlFor="guide-pin">
            PIN
          </Label>
          <Input
            id="guide-pin"
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
