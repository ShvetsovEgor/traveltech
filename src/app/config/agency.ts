/** Контент агентства «Технологии путешествий» — visitinno.ru */

const rawPhone = (import.meta.env.VITE_AGENCY_PHONE as string | undefined)?.trim();

export const AGENCY = {
  name: "Технологии путешествий",
  website: "https://visitinno.ru/",
  websiteLabel: "visitinno.ru",
  phone: rawPhone || "",
  phoneDisplay:
    (import.meta.env.VITE_AGENCY_PHONE_DISPLAY as string | undefined)?.trim() ||
    rawPhone ||
    "",
  headline: "Экскурсии в Иннополисе",
  immerseCta: "Погрузиться в мир технологий",
  award:
    "Победители Всероссийской туристской премии «Маршрут года»",
  stats: [
    { value: "150 000+", label: "довольных гостей" },
    { value: "3 года", label: "на рынке туристических услуг" },
  ],
  interactives: ["ИИ-творец", "Нейростилист"] as const,
  guidesHighlight: "Гиды — молодые жители города",
} as const;

/** Первый столбец ряда на рекламе: конкретные интерактивы + «только у нас». */
export function getInteractivesHighlight(): string {
  const list = AGENCY.interactives.join(" и ");
  return `${list} — только у нас`;
}


/** Звонок, если задан телефон; иначе сайт с бронированием */
export function getAgencyQrValue(): string {
  if (AGENCY.phone) {
    const digits = AGENCY.phone.replace(/[^\d+]/g, "");
    return digits.startsWith("+") ? `tel:${digits}` : `tel:+${digits.replace(/^\+/, "")}`;
  }
  return AGENCY.website;
}
