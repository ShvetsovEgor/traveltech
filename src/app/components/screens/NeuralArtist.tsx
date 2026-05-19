import { useState } from "react";
import { useNavigate } from "react-router";
import { Palette } from "lucide-react";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

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
    <KioskScreen backTo="/">
      <KioskHeader
        compact
        centered={false}
        title="Нейрохудожник"
        subtitle="Нарисуйте набросок, и мы превратим его в картину в стиле великих художников"
        icon={<Palette />}
      />

      <KioskBody>
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5">
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
      </KioskBody>
    </KioskScreen>
  );
}
