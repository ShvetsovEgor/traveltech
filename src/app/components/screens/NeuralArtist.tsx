import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Palette } from "lucide-react";
import { useKiosk } from "../../context/KioskContext";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

const artistStyles = [
  {
    id: "mucha",
    name: "Муха",
    coverSrc: "/static/artists/mucha.jpeg",
    description: "Ар-нуво",
  },
  {
    id: "wlop",
    name: "WLOP",
    coverSrc: "/static/artists/wlop.png",
    description: "Цифровой фэнтези",
  },
  {
    id: "rembrandt",
    name: "Рембрандт",
    coverSrc: "/static/artists/rembrandt.jpg",
    coverFit: "cover",
    description: "Светотень",
  },
  {
    id: "vangogh",
    name: "Ван Гог",
    coverSrc: "/static/artists/vangoch.jpg",
    coverFit: "cover",
    description: "Постимпрессионизм",
  },
  {
    id: "picasso",
    name: "Пикассо",
    coverSrc: "/static/artists/picasso.jpg",
    description: "Кубизм",
  },
  {
    id: "dali",
    name: "Дали",
    coverSrc: "/static/artists/dali.jpg",
    description: "Сюрреализм",
  },
  {
    id: "kandinsky",
    name: "Кандинский",
    coverSrc: "/static/artists/kandinsky.jpg",
    description: "Абстракция",
  },
  {
    id: "lego",
    name: "Лего",
    coverSrc: "/static/artists/lego.jpeg",
    description: "Кирпичная сборка",
  },
];

export function NeuralArtist() {
  const navigate = useNavigate();
  const { ensureInteraction } = useKiosk();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  useEffect(() => {
    ensureInteraction("neuro_artist").catch(() => undefined);
  }, [ensureInteraction]);

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
        title="ИИ-творец"
        subtitle="Нарисуйте набросок — мы сохраним композицию и перенесём её в стиль мастера"
        icon={<Palette />}
      />

      <KioskBody>
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:gap-5">
          {artistStyles.map((style) => (
            <SelectionCard
              key={style.id}
              title={style.name}
              description={style.description}
              coverSrc={style.coverSrc}
              coverAlt={style.name}
              coverFit={style.coverFit}
              selected={selectedStyle === style.id}
              onPress={() => handleStyleSelect(style.id)}
            />
          ))}
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
