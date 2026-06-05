import { useState } from "react";
import { Spinner } from "@heroui/react";
import { useKiosk } from "../../context/KioskContext";
import { AgencyAdScreen } from "./AgencyAdScreen";
import { GuideKioskQrScreen } from "./GuideKioskQrScreen";
import { WelcomeScreen } from "./WelcomeScreen";

/** Главный маршрут: реклама → QR гида (по нажатию) → меню после входа гида. */
export function HomeRoute() {
  const { isAuthenticated, authBootstrapped } = useKiosk();
  const [showGuideQr, setShowGuideQr] = useState(false);

  if (!authBootstrapped) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0c0824]">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <WelcomeScreen />;
  }

  if (showGuideQr) {
    return <GuideKioskQrScreen onScreenTap={() => setShowGuideQr(false)} />;
  }

  return <AgencyAdScreen onScreenTap={() => setShowGuideQr(true)} />;
}
