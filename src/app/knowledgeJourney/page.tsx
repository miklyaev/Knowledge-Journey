"use client";

import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import AIAssistant from "@/components/AIAssistant";

const KnowledgeJourney = () => {
	return (
		<main className="h-screen w-screen overflow-hidden flex flex-col">
			<TopBar />

			<div className="flex-grow flex flex-col items-center justify-start p-4 mt-16 gap-8 w-full max-w-7xl mx-auto overflow-y-auto">
				<GnomeWindow title="Маршрут обучения">
					<div className="flex flex-col gap-8 p-6 w-full">
						<div className="w-full">
							<AIAssistant />
						</div>

						<div className="w-full border-t border-gray-100 pt-8">
							<div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
								<div className="w-12 h-12 mb-3 opacity-20">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
									</svg>
								</div>
								<p className="text-lg font-medium">Ваш маршрут обучения формируется...</p>
							</div>
						</div>
					</div>
				</GnomeWindow>			</div>
		</main>
	);
};
export default KnowledgeJourney;
