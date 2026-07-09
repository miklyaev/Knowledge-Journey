const DEFAULT_API_BASE = "http://localhost:3031";

/** Базовый URL Express API без завершающего слэша. Задаётся в `.env`: `NEXT_PUBLIC_API_BASE_URL`. */
export function getPublicApiBaseUrl(): string {
	// Если есть переменная окружения, используем её
	if (process.env.NEXT_PUBLIC_API_BASE_URL) {
		return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
	}

	// Если мы в браузере на localhost, автоматически переключаемся на порт бэкенда 3031
	if (typeof window !== "undefined" && window.location.hostname === "localhost") {
		return "http://localhost:3031";
	}

	// Дефолтное значение
	return DEFAULT_API_BASE.replace(/\/+$/, "");
}