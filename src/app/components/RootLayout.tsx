import { Outlet } from "react-router";
import { KioskProvider } from "../context/KioskContext";

export function RootLayout() {
  return (
    <KioskProvider>
      <div className="w-screen h-screen overflow-hidden bg-background">
        <Outlet />
      </div>
    </KioskProvider>
  );
}
