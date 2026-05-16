import { useState } from "react";
import { useNavigate } from "react-router";
import { Box, Check } from "lucide-react";
import { Button, Chip, Surface, Typography } from "@heroui/react";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

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
        title="Нейробокс"
        subtitle="Преобразите своё лицо в разных стилях и мемах"
        icon={<Box className="size-16" />}
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
          <Surface variant="secondary" className="rounded-3xl p-8 mb-8">
            <Typography.Heading level={3} className="text-2xl mb-6">
              Настройки стиля:
            </Typography.Heading>
            <div className="flex flex-wrap gap-4">
              {selectedStyleData.options.map((option) => (
                <Chip
                  key={option}
                  className="cursor-pointer px-4 py-2"
                  color={selectedOptions.includes(option) ? "accent" : "default"}
                  onClick={() => toggleOption(option)}
                >
                  {selectedOptions.includes(option) && (
                    <Check className="size-4 mr-1 inline" />
                  )}
                  <Chip.Label>{option}</Chip.Label>
                </Chip>
              ))}
            </div>
          </Surface>
        )}

        {selectedStyle && (
          <div className="text-center">
            <Button variant="primary" size="lg" onPress={handleContinue}>
              Продолжить
            </Button>
          </div>
        )}
      </div>
    </KioskScreen>
  );
}
