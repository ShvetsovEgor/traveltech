import { useEffect, useState } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@heroui/react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

type NetworkStatusLineProps = {
  className?: string;
};

export function NetworkStatusLine({ className }: NetworkStatusLineProps) {
  const networkStatus = useNetworkStatus();
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  useEffect(() => {
    const sync = () => setBrowserOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const label =
    networkStatus === "online"
      ? "Интернет доступен"
      : networkStatus === "checking"
        ? "Проверяем интернет…"
        : browserOnline
          ? "Сервер недоступен"
          : "Нет интернета";

  const Icon =
    networkStatus === "offline"
      ? WifiOff
      : networkStatus === "checking"
        ? Loader2
        : Wifi;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs sm:text-sm",
        networkStatus === "online" && "text-emerald-200",
        networkStatus === "offline" && "text-red-200",
        networkStatus === "checking" && "text-white/70",
        className
      )}
      aria-live="polite"
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0 sm:size-4",
          networkStatus === "checking" && "animate-spin"
        )}
        aria-hidden
      />
      <span>{label}</span>
    </p>
  );
}
