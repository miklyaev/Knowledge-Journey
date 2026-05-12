"use client";

import React, { useState } from "react";
import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import { useAuth } from "@/lib/AuthContext";
import AIAssistant from "@/components/AIAssistant"; import FinalReport from "@/components/FinalReport";
import TimerSingleChoice from "@/components/TimerSingleChoice"; import TimerMultipleChoice from "@/components/TimerMultipleChoice";
import TimerFillTheBlank from "@/components/TimerFillTheBlank";
import TimerMatchPairs from "@/components/TimerMatchPairs";
import TimerTrueFalse from "@/components/TimerTrueFalse";
import TimerOrderSteps from "@/components/TimerOrderSteps";
import TimerFreeResponse from "@/components/TimerFreeResponse";
import { Map, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

const KnowledgeJourney = () => {
	const { user } = useAuth();
	const [journey, setJourney] = useState<any[] | null>(null); const [currentStep, setCurrentStep] = useState(0);
	const [isFinished, setIsFinished] = useState(false);
	const [resetTrigger, setResetTrigger] = useState(0);
	const [topic, setTopic] = useState('');
	const [totalScore, setTotalScore] = useState(0);
	const [isStepFinished, setIsStepFinished] = useState(false);
	const [lastPoints, setLastPoints] = useState(0);
	const [showReport, setShowReport] = useState(false);
	const [stepResults, setStepResults] = useState<any[]>([]);

	const handleJourneyGenerated = (data: any[]) => {
		setJourney(data);
		setCurrentStep(0);
		setIsFinished(false);
		setTotalScore(0);
		setIsStepFinished(false);
		setStepResults([]);
	};

	const handleStepComplete = (isCorrect: boolean, points: number = 0, timeSpent: number = 0) => {
		if (!journey) return;

		const earnedPoints = isCorrect ? points : (journey[currentStep].type === 'free-response' ? points : 0);
		setLastPoints(earnedPoints);
		setTotalScore(prev => prev + earnedPoints);
		setIsStepFinished(true);

		// Сохраняем результат шага для отчета
		setStepResults(prev => [...prev, {
			question: journey[currentStep].question || journey[currentStep].task || "Задание",
			isCorrect: isCorrect || (journey[currentStep].type === 'free-response' && points > 0),
			timeSpent: timeSpent
		}]);
	}; const handleNextStep = () => {
		if (!journey) return;

		if (currentStep < journey.length - 1) {
			setCurrentStep(currentStep + 1);
			setIsStepFinished(false);
			setLastPoints(0);
		} else {
			setIsFinished(true);
		}
	};

	const handleContinue = () => {
		setJourney(null);
		setIsFinished(false);
		setResetTrigger(prev => prev + 1);
		// Скролл к нижней части чата (к полю ввода)
		setTimeout(() => {
			const element = document.getElementById('ai-assistant-input-area');
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 100);
	};

	const handleFinish = () => {
		setShowReport(true);
	};

	const handleCloseReport = () => {
		setShowReport(false);
		window.location.href = '/';
	};
	const renderStep = () => {
		if (!journey) return null;
		const step = journey[currentStep];

		// Назначаем веса в зависимости от типа компонента
		const getWeight = (type: string) => {
			switch (type) {
				case "true-false": return 2;
				case "single-choice": return 3;
				case "multiple-choice": return 5;
				case "fill-the-blank": return 6;
				case "order-steps": return 7;
				case "match-pairs": return 8;
				case "free-response": return 10;
				default: return 1;
			}
		};

		const weight = step.weight || getWeight(step.type);
		const timerSeconds = step.timerSeconds || 30;

		const commonProps = {
			onComplete: (isCorrect: boolean, points: number = weight, timeSpent: number = 0) =>
				handleStepComplete(isCorrect, points, timeSpent),
			timerSeconds: timerSeconds,
			weight: weight
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
			case "free-response":
				return <TimerFreeResponse {...step} {...commonProps} />;
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

						<div className="w-full" id="ai-assistant-container">
							<AIAssistant
								onJourneyGenerated={handleJourneyGenerated}
								resetTrigger={resetTrigger}
								topic={topic}
								onTopicDetected={setTopic}
							/>
						</div>

						{journey && (
							<div className="w-full border-t border-gray-100 pt-8">
								{isFinished ? (
									<div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in duration-300">
										<div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
											<CheckCircle2 size={32} />
										</div>
										<h3 className="text-2xl font-bold text-gray-800 mb-2">Блок заданий пройден!</h3>
										<div className="mb-6 px-6 py-2 bg-ubuntu-orange/10 border border-ubuntu-orange/20 rounded-full">
											<span className="text-ubuntu-orange font-bold text-lg">
												Набрано баллов: {totalScore}
											</span>
										</div>
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
										<div className="mb-3 flex items-center justify-between px-2">
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

										{isStepFinished && (
											<div className="mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
												<div className="flex items-center gap-3 px-6 py-3 bg-white border border-ubuntu-orange/20 rounded-2xl shadow-sm">
													<span className="text-gray-600 font-medium">Результат этапа:</span>
													<span className="text-ubuntu-orange font-bold text-xl">+{lastPoints} баллов</span>
												</div>
												<button
													onClick={handleNextStep}
													className="group flex items-center gap-2 px-6 py-2.5 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-ubuntu-orange/20 active:scale-95 text-sm"
												>
													{currentStep < journey.length - 1 ? "Следующий тест" : "Посмотреть итоги"}
													<ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</GnomeWindow>
			</div>

			{showReport && (
				<FinalReport
					results={stepResults}
					onRestart={() => {
						setShowReport(false);
						handleContinue();
					}}
					onClose={handleCloseReport}
					username={user || "Гость"}
					topic={topic}
					totalScore={totalScore}
				/>)}
		</main>);
};

export default KnowledgeJourney;
