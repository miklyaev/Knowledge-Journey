const DEFAULT_API_BASE = "http://localhost:3031";

/** Базовый URL Express API без завершающего слэша. Задаётся в `.env`: `NEXT_PUBLIC_API_BASE_URL`. */
export function getPublicApiBaseUrl(): string {
	// Серверная сторона (Next.js API Routes): используем переменную окружения или дефолт
	if (typeof window === "undefined") {
		return (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, "");
	}

	// Клиент (браузер) на localhost: прямой доступ к бэкенду для разработки
	if (window.location.hostname === "localhost") {
		return DEFAULT_API_BASE;
	}

	// Клиент (браузер) на проде: относительный URL → same-origin HTTPS → Next.js proxy → бэкенд
	return "";
}
