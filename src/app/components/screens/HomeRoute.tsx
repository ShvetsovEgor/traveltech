import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Spinner } from "@heroui/react";
import { useKiosk } from "../../context/KioskContext";
import { getKioskIdFromSearch } from "../../utils/kioskLocation";
import { AgencyAdScreen } from "./AgencyAdScreen";
import { GuideKioskQrScreen } from "./GuideKioskQrScreen";
import { LobachevskyArtistScreen } from "./LobachevskyArtistScreen";
import { PopovaAdScreen } from "./PopovaAdScreen";
import { WelcomeScreen } from "./WelcomeScreen";

/** Главный маршрут: реклама → QR гида (по нажатию) → меню после входа гида. */
export function HomeRoute() {
  const { isAuthenticated, authBootstrapped, kioskId } = useKiosk();
  const [searchParams] = useSearchParams();
  const [showGuideQr, setShowGuideQr] = useState(false);
  const locationId = useMemo(
    () => getKioskIdFromSearch(searchParams.toString()) ?? kioskId,
    [searchParams, kioskId]
  );
  const isLightHome = locationId === "Popova" || locationId === "Lobachevsky";

  if (!authBootstrapped) {
    return (
      <div
        className={
          isLightHome
            ? "fixed inset-0 flex items-center justify-center bg-[#f3efe6]"
            : "fixed inset-0 flex items-center justify-center bg-[#0c0824]"
        }
      >
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (locationId === "Lobachevsky") return <LobachevskyArtistScreen />;
    return <WelcomeScreen />;
  }

  if (showGuideQr) {
    return <GuideKioskQrScreen onScreenTap={() => setShowGuideQr(false)} />;
  }

  if (isLightHome) {
    return <PopovaAdScreen onScreenTap={() => setShowGuideQr(true)} />;
  }

  return <AgencyAdScreen onScreenTap={() => setShowGuideQr(true)} />;
}
