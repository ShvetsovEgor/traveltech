import { useState } from "react";
import { useNavigate } from "react-router";
import { Palette } from "lucide-react";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

const artistStyles = [
  { id: "vangogh", name: "Ван Гог", image: "🎨", description: "Постимпрессионизм" },
  { id: "picasso", name: "Пикассо", image: "🖼️", description: "Кубизм" },
  { id: "monet", name: "Моне", image: "🌸", description: "Импрессионизм" },
  { id: "dali", name: "Дали", image: "⏰", description: "Сюрреализм" },
  { id: "kandinsky", name: "Кандинский", image: "🎭", description: "Абстракционизм" },
  { id: "klimt", name: "Климт", image: "✨", description: "Модерн" },
];

export function NeuralArtist() {
  const navigate = useNavigate();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    setTimeout(() => {
      navigate("/neural-artist/sketch", { state: { style: styleId } });
    }, 300);
  };

  return (
    <KioskScreen backTo="/menu">
      <KioskHeader
        title="Нейрохудожник"
        subtitle="Нарисуйте набросок, и мы превратим его в картину в стиле великих художников"
        icon={<Palette className="size-16" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {artistStyles.map((style) => (
          <SelectionCard
            key={style.id}
            title={style.name}
            description={style.description}
            emoji={style.image}
            selected={selectedStyle === style.id}
            onPress={() => handleStyleSelect(style.id)}
          />
        ))}
      </div>
    </KioskScreen>
  );
}
