import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: "Knowledge Journey — интерактивное обучение с ИИ",
		template: "%s | Knowledge Journey",
	},
	description:
		"Knowledge Journey превращает чтение в активное обучение: ИИ-ассистент задаёт вопросы по выбранной теме, проверяет свободные ответы и ведёт журнал ваших успехов.",
	applicationName: "Knowledge Journey",
	keywords: [
		"интерактивное обучение",
		"обучение с ИИ",
		"ИИ-ассистент",
		"проверка знаний",
		"активное воспроизведение",
		"журнал успехов",
	],
	openGraph: {
		type: "website",
		locale: "ru_RU",
		siteName: "Knowledge Journey",
		title: "Knowledge Journey — интерактивное обучение с ИИ",
		description:
			"Превратите чтение в активное обучение: вопросы от ИИ-ассистента, проверка свободных ответов и журнал прогресса.",
		url: "/",
	},
	twitter: {
		card: "summary",
		title: "Knowledge Journey — интерактивное обучение с ИИ",
		description:
			"Превратите чтение в активное обучение: вопросы от ИИ-ассистента, проверка свободных ответов и журнал прогресса.",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ru">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap" rel="stylesheet" />
			</head>
			<body className="antialiased">
				<AuthProvider>
					{children}
				</AuthProvider>
			</body>
		</html>
	);
}
