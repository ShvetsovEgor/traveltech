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
    coverSrc: "/static/artists/rembrandt.png",
    coverFit: "cover",
    description: "Светотень",
  },
  {
    id: "vangogh",
    name: "Ван Гог",
    coverSrc: "/static/artists/vangoch.jpg",
    coverFit: "cover",
    description: "Постимпрессия",
  },
  {
    id: "picasso",
    name: "Пикассо",
    coverSrc: "/static/artists/picasso.png",
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
    coverSrc: "/static/artists/kandinsky.png",
    description: "Абстракция",
  },
  {
    id: "aivasovsky",
    name: "Айвазовский",
    coverSrc: "/static/artists/aivasovsky.png",
    coverFit: "cover",
    description: "Морской романтизм",
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
        <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
          {artistStyles.map((style) => (
            <SelectionCard
              key={style.id}
              variant="compact"
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
