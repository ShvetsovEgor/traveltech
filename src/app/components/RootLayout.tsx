import { Outlet } from "react-router";
import { KioskProvider } from "../context/KioskContext";
import { EndSessionButton } from "./EndSessionButton";
import { KioskAuthGuard } from "./KioskAuthGuard";
import { KioskChromeProvider } from "./kiosk/KioskChromeContext";

function AppShell() {
  return (
    <KioskChromeProvider>
      <KioskAuthGuard />
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
        <EndSessionButton />
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </KioskChromeProvider>
  );
}

export function RootLayout() {
  return (
    <KioskProvider>
      <AppShell />
    </KioskProvider>
  );
}
