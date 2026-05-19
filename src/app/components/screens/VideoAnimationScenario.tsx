import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Check, Play, Clapperboard } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  ProgressCircle,
  Surface,
  Typography,
} from "@heroui/react";
import { api, resolveMediaUrl } from "../../api/client";
import { useKiosk } from "../../context/KioskContext";
import { useTaskPolling } from "../../hooks/useTaskPolling";
import {
  KioskBody,
  KioskHeader,
  KioskScreen,
  MediaWithQrOverlay,
  SelectionCard,
} from "../kiosk";

const scenarios = [
  { id: "dancing", name: "Танец", emoji: "💃", options: ["Диско", "Балет", "Хип-хоп"] },
  { id: "running", name: "Марафон", emoji: "🏃", options: ["Городская улица", "Лес", "Стадион"] },
  { id: "singing", name: "Пение", emoji: "🎤", options: ["Рок-концерт", "Опера", "Караоке"] },
  { id: "space", name: "Космос", emoji: "🚀", options: ["Невесомость", "Лунная поверхность", "Станция"] },
];

export function VideoAnimationScenario() {
  const navigate = useNavigate();
  const location = useLocation();
  const photoFile = location.state?.photoFile as File | undefined;
  const { interactionToken } = useKiosk();

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) navigate("/video-animation", { replace: true });
  }, [photoFile, navigate]);

  useTaskPolling(taskId, interactionToken, {
    onComplete: (url) => {
      setIsGenerating(false);
      setResultUrl(url);
      setShowResult(true);
    },
    onError: (msg) => {
      setIsGenerating(false);
      setError(msg);
    },
  });

  const handleGenerate = async () => {
    if (!photoFile || !interactionToken || !selectedScenario || !selectedOption) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.videoGenerate(
        photoFile,
        selectedScenario,
        interactionToken,
        [selectedOption]
      );
      setTaskId(res.task_id);
    } catch (e) {
      setIsGenerating(false);
      setError(e instanceof Error ? e.message : "Ошибка запуска");
    }
  };

  const selectedScenarioData = scenarios.find((s) => s.id === selectedScenario);
  const mediaUrl = resultUrl ? resolveMediaUrl(resultUrl) : null;

  return (
    <KioskScreen backTo="/video-animation">
      <KioskHeader
        compact
        centered={false}
        title={showResult ? "Ваше видео готово!" : "Выберите сценарий"}
        subtitle={showResult ? undefined : "Что будет происходить на видео?"}
        icon={<Clapperboard />}
      />

      <KioskBody>
      {error && (
        <Alert status="danger" className="mb-3 max-w-2xl">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {!isGenerating && !showResult && (
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {scenarios.map((scenario) => (
              <SelectionCard
                key={scenario.id}
                title={scenario.name}
                emoji={scenario.emoji}
                selected={selectedScenario === scenario.id}
                onPress={() => {
                  setSelectedScenario(scenario.id);
                  setSelectedOption(null);
                }}
              />
            ))}
          </div>

          {selectedScenarioData && (
            <Surface variant="secondary" className="mb-4 rounded-2xl p-4 sm:p-6">
              <Typography.Heading level={3} className="mb-4 text-xl sm:text-2xl">
                Выберите локацию:
              </Typography.Heading>
              <div className="flex flex-wrap gap-4">
                {selectedScenarioData.options.map((option) => (
                  <Chip
                    key={option}
                    className="cursor-pointer px-4 py-2"
                    color={selectedOption === option ? "accent" : "default"}
                    onClick={() => setSelectedOption(option)}
                  >
                    {selectedOption === option && (
                      <Check className="size-4 mr-1 inline" />
                    )}
                    <Chip.Label>{option}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </Surface>
          )}

          {selectedScenario && selectedOption && (
            <div className="text-center">
              <Button variant="primary" size="lg" onPress={handleGenerate}>
                <Play className="size-6" />
                Создать видео
              </Button>
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="text-center">
          <ProgressCircle
            isIndeterminate
            size="lg"
            color="accent"
            className="mx-auto mb-8"
            aria-label="Создание видео"
          />
          <Typography.Heading level={2} className="mb-4 text-4xl font-bold text-foreground">
            Создаём видео...
          </Typography.Heading>
          <Typography.Paragraph className="text-lg text-foreground/75 md:text-xl">
            Это может занять несколько минут
          </Typography.Paragraph>
        </div>
      )}

      {showResult && mediaUrl && (
        <div className="flex flex-col items-center gap-3">
          <MediaWithQrOverlay
            url={mediaUrl}
            alt="Сгенерированное видео"
            variant="video"
          />
          <Typography.Paragraph className="text-center text-sm text-muted-foreground">
            Отсканируйте QR-код в углу видео
          </Typography.Paragraph>
        </div>
      )}

      {showResult && (
        <div className="pt-4 text-center">
          <Button variant="primary" size="lg" onPress={() => navigate("/")}>
            Вернуться в меню
          </Button>
        </div>
      )}
      </KioskBody>
    </KioskScreen>
  );
}
