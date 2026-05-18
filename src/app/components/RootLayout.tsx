import { Outlet } from "react-router";
import { KioskProvider } from "../context/KioskContext";
import { EndSessionButton } from "./EndSessionButton";

function AppShell() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <EndSessionButton />
      <Outlet />
    </div>
  );
}

export function RootLayout() {
  return (
    <KioskProvider>
      <AppShell />
    </KioskProvider>
  );
}
