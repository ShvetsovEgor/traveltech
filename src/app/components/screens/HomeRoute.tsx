import { useEffect, useState } from "react";
import { useKiosk } from "../../context/KioskContext";
import { AgencyAdScreen } from "./AgencyAdScreen";
import { GuideKioskQrScreen } from "./GuideKioskQrScreen";
import { WelcomeScreen } from "./WelcomeScreen";

/** Главный маршрут: реклама → QR гида (по нажатию) → киоск после входа. */
export function HomeRoute() {
  const { isAuthenticated } = useKiosk();
  const [showGuideQr, setShowGuideQr] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowGuideQr(false);
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <WelcomeScreen />;
  }

  if (showGuideQr) {
    return <GuideKioskQrScreen onScreenTap={() => setShowGuideQr(false)} />;
  }

  return <AgencyAdScreen onScreenTap={() => setShowGuideQr(true)} />;
}
