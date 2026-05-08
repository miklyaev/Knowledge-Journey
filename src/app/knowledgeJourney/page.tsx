"use client";

import { TopBar, GnomeWindow } from "@/components/GnomeUI";

const KnowledgeJourney = () => {
	return (
		<main className="h-screen w-screen overflow-hidden flex flex-col">
			<TopBar />

			<div className="flex-grow flex items-center justify-center p-4 mt-8">
				<GnomeWindow title="Маршрут обучения">
					<div className="flex flex-col items-center justify-center h-64 text-gray-500">
						<div className="w-16 h-16 mb-4 opacity-20">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
							</svg>
						</div>
						<p className="text-xl font-medium">Ваш маршрут обучения формируется...</p>
						<p className="text-sm">Здесь будет визуализация вашего прогресса и следующих шагов.</p>
					</div>
				</GnomeWindow>
			</div>
		</main>
	);
};

export default KnowledgeJourney;
