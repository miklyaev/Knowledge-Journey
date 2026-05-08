import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Интерактивная система обучения",
	description: "Современная система обучения в стиле GNOME",
};

import { AuthProvider } from "@/lib/AuthContext";

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