import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Palette, Sparkles, Brush } from "lucide-react";
import { Button, ProgressCircle, Surface, Typography } from "@heroui/react";
import { api } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import { KioskScreen } from "../kiosk";

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

      <Typography.Heading level={2} className="text-4xl md:text-5xl mb-6">
        Создаём шедевр...
      </Typography.Heading>
      <Typography.Paragraph className="text-xl text-muted mb-12">
        Генерация может занять до нескольких минут
      </Typography.Paragraph>

      <div className="space-y-4 w-full max-w-md">
        {loadingSteps.map((step, index) => (
          <Surface
            key={index}
            variant="secondary"
            className="flex items-center gap-4 rounded-xl p-4"
          >
            <step.icon className="size-8 text-accent" />
            <Typography.Paragraph className="text-lg">{step.text}</Typography.Paragraph>
          </Surface>
        ))}
      </div>
    </KioskScreen>
  );
}
