import { useState } from "react";
import { useNavigate } from "react-router";
import { Box, Check } from "lucide-react";
import { Button, Chip, Surface, Typography } from "@heroui/react";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

const styles = [
  { id: "anime", name: "Аниме", emoji: "🎌", options: ["Яркие цвета", "Большие глаза"] },
  { id: "cartoon", name: "Мультяшный", emoji: "🎬", options: ["3D стиль", "Пиксельный"] },
  { id: "renaissance", name: "Ренессанс", emoji: "🖼️", options: ["Классика", "Барокко"] },
  { id: "cyberpunk", name: "Киберпанк", emoji: "🤖", options: ["Неон", "Темный фон"] },
  { id: "zombie", name: "Зомби", emoji: "🧟", options: ["Страшный", "Веселый"] },
  { id: "superhero", name: "Супергерой", emoji: "🦸", options: ["Marvel", "DC"] },
];

export function NeuralBox() {
  const navigate = useNavigate();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    setSelectedOptions([]);
  };

  const toggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleContinue = () => {
    navigate("/neural-box/gender", { state: { style: selectedStyle, options: selectedOptions } });
  };

  const selectedStyleData = styles.find((s) => s.id === selectedStyle);

  return (
    <KioskScreen backTo="/menu">
      <KioskHeader
        compact
        centered={false}
        title="Нейробокс"
        subtitle="Преобразите своё лицо в разных стилях и мемах"
        icon={<Box />}
      />

      <KioskBody>
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {styles.map((style) => (
              <SelectionCard
                key={style.id}
                title={style.name}
                emoji={style.emoji}
                selected={selectedStyle === style.id}
                onPress={() => handleStyleSelect(style.id)}
              />
            ))}
          </div>

          {selectedStyleData && (
            <Surface variant="secondary" className="mb-4 rounded-2xl p-4 sm:p-6">
              <Typography.Heading level={3} className="mb-4 text-xl sm:text-2xl">
                Настройки стиля:
              </Typography.Heading>
              <div className="flex flex-wrap gap-3">
                {selectedStyleData.options.map((option) => (
                  <Chip
                    key={option}
                    className="cursor-pointer px-4 py-2"
                    color={selectedOptions.includes(option) ? "accent" : "default"}
                    onClick={() => toggleOption(option)}
                  >
                    {selectedOptions.includes(option) && (
                      <Check className="mr-1 inline size-4" />
                    )}
                    <Chip.Label>{option}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </Surface>
          )}

          {selectedStyle && (
            <div className="pt-2 text-center">
              <Button variant="primary" size="lg" onPress={handleContinue}>
                Продолжить
              </Button>
            </div>
          )}
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
