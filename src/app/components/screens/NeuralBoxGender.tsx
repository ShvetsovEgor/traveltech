import { useNavigate, useLocation } from "react-router";
import { User } from "lucide-react";
import { KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

const genders = [
  { id: "male", name: "Мужской", emoji: "👨" },
  { id: "female", name: "Женский", emoji: "👩" },
  { id: "neutral", name: "Нейтральный", emoji: "🧑" },
];

export function NeuralBoxGender() {
  const navigate = useNavigate();
  const location = useLocation();
  const { style, options } = location.state || {};

  const handleGenderSelect = (gender: string) => {
    navigate("/neural-box/photo", { state: { style, options, gender } });
  };

  return (
    <KioskScreen backTo="/neural-box" contentClassName="flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <KioskHeader
          title="Выберите пол"
          subtitle="Это поможет создать лучший результат"
          icon={<User className="size-24" />}
        />

        <div className="flex flex-col md:flex-row gap-6 justify-center">
          {genders.map((gender) => (
            <SelectionCard
              key={gender.id}
              title={gender.name}
              emoji={gender.emoji}
              onPress={() => handleGenderSelect(gender.id)}
              className="min-w-[200px] text-center md:p-12"
            />
          ))}
        </div>
      </div>
    </KioskScreen>
  );
}
