const DEFAULT_API_BASE = "http://localhost:3031";

/** Базовый URL Express API без завершающего слэша. Задаётся в `.env`: `NEXT_PUBLIC_API_BASE_URL`. */
export function getPublicApiBaseUrl(): string {
	// 1. Приоритет переменной окружения (работает и на сервере, и на клиенте при сборке)
	const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (envBaseUrl) {
		return envBaseUrl.replace(/\/+$/, "");
	}

	// 2. Если мы в браузере на localhost и переменная не задана, используем дефолтный порт бэкенда
	if (typeof window !== "undefined" && window.location.hostname === "localhost") {
		return DEFAULT_API_BASE;
	}

	// 3. Дефолтное значение
	return DEFAULT_API_BASE;
}
