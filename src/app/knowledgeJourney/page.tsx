"use client";

import React, { useState } from "react";
import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import AIAssistant from "@/components/AIAssistant";
import TimerSingleChoice from "@/components/TimerSingleChoice";
import TimerMultipleChoice from "@/components/TimerMultipleChoice";
import TimerFillTheBlank from "@/components/TimerFillTheBlank";
import TimerMatchPairs from "@/components/TimerMatchPairs";
import TimerTrueFalse from "@/components/TimerTrueFalse";
import TimerOrderSteps from "@/components/TimerOrderSteps";
import { Map, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

const KnowledgeJourney = () => {
	const [journey, setJourney] = useState<any[] | null>(null);
	const [currentStep, setCurrentStep] = useState(0);
	const [isFinished, setIsFinished] = useState(false);

	const handleJourneyGenerated = (data: any[]) => {
		setJourney(data);
		setCurrentStep(0);
		setIsFinished(false);
	};

	const handleStepComplete = (isCorrect: boolean, timeSpent: number) => {
		if (!journey) return;

		if (currentStep < journey.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			setIsFinished(true);
		}
	};

	const handleContinue = () => {
		setJourney(null);
		setIsFinished(false);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleFinish = () => {
		window.location.href = '/';
	};

	const renderStep = () => {
		if (!journey) return null;
		const step = journey[currentStep];

		const commonProps = {
			onComplete: handleStepComplete,
			timerSeconds: step.timerSeconds || 30,
		};

		switch (step.type) {
			case "single-choice":
				return <TimerSingleChoice {...step} {...commonProps} />;
			case "multiple-choice":
				return <TimerMultipleChoice {...step} {...commonProps} />;
			case "fill-the-blank":
				return <TimerFillTheBlank {...step} {...commonProps} />;
			case "match-pairs":
				return <TimerMatchPairs {...step} {...commonProps} />;
			case "true-false":
				return <TimerTrueFalse {...step} {...commonProps} />;
			case "order-steps":
				return <TimerOrderSteps {...step} {...commonProps} />;
			default:
				return <div>Неизвестный тип задания: {step.type}</div>;
		}
	};

	return (
		<main className="h-screen w-screen overflow-hidden flex flex-col bg-[#e8e8e7]">
			<TopBar />

			<div className="flex-grow flex flex-col items-center justify-start p-4 mt-16 gap-8 w-full max-w-7xl mx-auto overflow-y-auto">
				<GnomeWindow title="Маршрут обучения">
					<div className="flex flex-col gap-2 p-6 w-full">
						{!journey && (
							<div className="w-full border-b border-gray-100 pb-2">
								<div className="flex flex-col items-center justify-center py-[5px] text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
									<div className="w-6 h-6 mb-1 opacity-20">
										<Map className="w-full h-full" />
									</div>
									<p className="text-sm font-medium">Опишите тему, чтобы сформировать маршрут...</p>
								</div>
							</div>
						)}

						<div className="w-full">
							<AIAssistant onJourneyGenerated={handleJourneyGenerated} />
						</div>

						{journey && (
							<div className="w-full border-t border-gray-100 pt-8">
								{isFinished ? (
									<div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in duration-300">
										<div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
											<CheckCircle2 size={32} />
										</div>
										<h3 className="text-2xl font-bold text-gray-800 mb-2">Блок заданий пройден!</h3>
										<p className="text-gray-500 text-center mb-8 max-w-md">
											Вы успешно справились с текущим этапом. Хотите углубиться в тему или завершить сессию?
										</p>
										<div className="flex gap-4 w-full max-w-sm">
											<button
												onClick={handleContinue}
												className="flex-1 py-3 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
											>
												Продолжить <ArrowRight size={18} />
											</button>
											<button
												onClick={handleFinish}
												className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all active:scale-95"
											>
												Завершить
											</button>
										</div>
									</div>
								) : (
									<div className="w-full max-w-3xl mx-auto">
										<div className="mb-6 flex items-center justify-between px-2">
											<div className="flex items-center gap-2 text-gray-600">
												<Sparkles size={18} className="text-ubuntu-orange" />
												<span className="text-sm font-bold uppercase tracking-wider">
													Этап {currentStep + 1} из {journey.length}
												</span>
											</div>
											<div className="flex gap-1">
												{journey.map((_, i) => (
													<div
														key={i}
														className={`h-1.5 w-8 rounded-full transition-all ${i === currentStep
															? "bg-ubuntu-orange w-12"
															: i < currentStep
																? "bg-green-500"
																: "bg-gray-300"
															}`}
													/>
												))}
											</div>
										</div>
										{renderStep()}
									</div>
								)}
							</div>
						)}
					</div>
				</GnomeWindow>
			</div>
		</main>
	);
};

export default KnowledgeJourney;
