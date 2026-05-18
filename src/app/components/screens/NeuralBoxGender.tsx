import { useNavigate, useLocation } from "react-router";
import { User } from "lucide-react";
import { KioskBody, KioskHeader, KioskScreen, SelectionCard } from "../kiosk";

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
    <KioskScreen backTo="/neural-box">
      <KioskHeader
        compact
        centered={false}
        title="Выберите пол"
        subtitle="Это поможет создать лучший результат"
        icon={<User />}
      />

      <KioskBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          {genders.map((gender) => (
            <SelectionCard
              key={gender.id}
              title={gender.name}
              emoji={gender.emoji}
              onPress={() => handleGenderSelect(gender.id)}
              className="min-w-0 flex-1 sm:min-w-[160px] sm:max-w-[220px]"
            />
          ))}
        </div>
      </KioskBody>
    </KioskScreen>
  );
}
