import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { LogOut } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { useKiosk } from "../context/KioskContext";

export function EndSessionButton() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, logout } = useKiosk();
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const handleEndSession = async () => {
    setLoading(true);
    try {
      await logout();
      const query = searchParams.toString();
      navigate(query ? `/?${query}` : "/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      className="fixed top-4 right-4 z-30 gap-2 border border-white/30 bg-white/95 text-foreground shadow-md backdrop-blur-sm sm:top-5 sm:right-5 sm:text-base"
      isDisabled={loading}
      onPress={handleEndSession}
    >
      {loading ? (
        <Spinner size="sm" color="current" />
      ) : (
        <LogOut className="size-4 sm:size-5" aria-hidden />
      )}
      Завершить сессию
    </Button>
  );
}
