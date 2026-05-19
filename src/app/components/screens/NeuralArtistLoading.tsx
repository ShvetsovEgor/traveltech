import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Palette, Sparkles, Brush } from "lucide-react";
import { Button, ProgressCircle, Typography } from "@heroui/react";
import { api } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import { KioskScreen, LoadingStepsList } from "../kiosk";

const loadingSteps = [
  { icon: Palette, text: "Подбираем палитру..." },
  { icon: Brush, text: "Обводим контуры..." },
  { icon: Sparkles, text: "Добавляем детали..." },
];

export function NeuralArtistLoading() {
  const navigate = useNavigate();
  const location = useLocation();
  const { interactionToken } = useKiosk();
  const style = location.state?.style || "vangogh";
  const sketchFile = location.state?.sketchFile as File | undefined;

  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sketchFile || !interactionToken) {
      navigate("/neural-artist", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await api.artistGenerate(sketchFile, style, interactionToken);
        if (!cancelled) setTaskId(res.task_id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка запуска генерации");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sketchFile, interactionToken, style, navigate]);

  useTaskPolling(taskId, interactionToken, {
    onComplete: (resultUrl) => {
      navigate("/neural-artist/result", { state: { style, resultUrl } });
    },
    onError: (message) => setError(message),
  });

  if (error) {
    return (
      <KioskScreen
        className="items-center justify-center"
        contentClassName="flex flex-col items-center text-center max-w-md"
      >
        <Typography.Paragraph className="text-xl mb-6">{error}</Typography.Paragraph>
        <Button
          variant="primary"
          onPress={() => navigate("/neural-artist/sketch", { state: { style } })}
        >
          Попробовать снова
        </Button>
      </KioskScreen>
    );
  }

  return (
    <KioskScreen
      className="items-center justify-center"
      contentClassName="flex flex-col items-center text-center"
    >
      <ProgressCircle
        isIndeterminate
        size="lg"
        color="accent"
        className="mb-12"
        aria-label="Генерация"
      />

      <Typography.Heading
        level={2}
        className="mb-4 text-4xl font-bold text-foreground md:text-5xl"
      >
        Создаём шедевр...
      </Typography.Heading>
      <Typography.Paragraph className="mb-10 text-lg text-foreground/75 md:text-xl">
        Генерация может занять до нескольких минут
      </Typography.Paragraph>

      <LoadingStepsList steps={loadingSteps} />
    </KioskScreen>
  );
}
