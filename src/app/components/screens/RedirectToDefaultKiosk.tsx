import { useEffect } from "react";

/** Нет точки в адресе и в сессии — остаёмся на текущем хосте и открываем Попову. */
export function RedirectToDefaultKiosk() {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("location", "Popova");
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
  }, []);

  return null;
}
