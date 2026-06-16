import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@heroui/react";

interface BackButtonProps {
  to?: string;
  className?: string;
  onBack?: () => void;
}

export function BackButton({ to, className = "", onBack }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    onBack?.();
    if (to) {
      navigate({ pathname: to, search: location.search });
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      className={className}
      onPress={handleClick}
    >
      <ArrowLeft className="size-5" />
      Назад
    </Button>
  );
}
