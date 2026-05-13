const DEFAULT_API_BASE = "http://localhost:3031";

/** Базовый URL Express API без завершающего слэша. Задаётся в `.env`: `NEXT_PUBLIC_API_BASE_URL`. */
export function getPublicApiBaseUrl(): string {
	const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
	return raw.replace(/\/+$/, "");
}
