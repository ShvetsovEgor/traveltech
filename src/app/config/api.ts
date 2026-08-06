/** Статический фронт без прокси /api и /static → ассеты с бэкенда Render. */
export const STATIC_FRONTEND_HOSTS = [
  "missioninnopolis.ru",
  "www.missioninnopolis.ru",
] as const;

/** Актуальный backend на Render (если VITE_API_URL не задан при сборке). */
export const PRODUCTION_API_FALLBACK = "https://traveltech-8md1.onrender.com";
