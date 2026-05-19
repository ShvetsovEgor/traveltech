import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@heroui/react";

interface BackButtonProps {
  to?: string;
  className?: string;
}

export function BackButton({ to, className = "" }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
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
