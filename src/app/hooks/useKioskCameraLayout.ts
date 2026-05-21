import { useMemo } from "react";
import { getKioskCameraLayout } from "../config/kioskCamera";
import { useKiosk } from "../context/KioskContext";

export function useKioskCameraLayout() {
  const { kioskId } = useKiosk();
  return useMemo(() => getKioskCameraLayout(kioskId), [kioskId]);
}
