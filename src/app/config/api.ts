/** Статический фронт без прокси /api и /static → ассеты с бэкенда Render. */
export const STATIC_FRONTEND_HOSTS = [
  "missioninnopolis.ru",
  "www.missioninnopolis.ru",
] as const;

export const PRODUCTION_API_FALLBACK = "https://traveltech-mgig.onrender.com";
