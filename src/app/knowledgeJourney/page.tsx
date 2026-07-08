"use client";

import React, { useState, useEffect } from "react";
import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import { useAuth } from "@/lib/AuthContext";
import AIAssistant from "@/components/AIAssistant"; import FinalReport from "@/components/FinalReport";
import TimerSingleChoice from "@/components/TimerSingleChoice"; import TimerMultipleChoice from "@/components/TimerMultipleChoice";
import TimerFillTheBlank from "@/components/TimerFillTheBlank";
import TimerMatchPairs from "@/components/TimerMatchPairs";
import TimerTrueFalse from "@/components/TimerTrueFalse";
import TimerOrderSteps from "@/components/TimerOrderSteps";
import TimerFreeResponse from "@/components/TimerFreeResponse";
import { Map, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getPublicApiBaseUrl } from "@/lib/apiBase";

interface Topic {
	id: string;
	title: string;
	prompt: string | null;
}

const KnowledgeJourney = () => {
	const { user } = useAuth();
	const [topics, setTopics] = useState<Topic[]>([{ id: 'none', title: 'Загрузка тем...', prompt: null }]);
	const [isLoadingThemes, setIsLoadingThemes] = useState(true);
	const [journey, setJourney] = useState<any[] | null>(null); const [currentStep, setCurrentStep] = useState(0);
	const [isFinished, setIsFinished] = useState(false);
	const [resetTrigger, setResetTrigger] = useState(0);
	const [topic, setTopic] = useState('');
	const [selectedTopicId, setSelectedTopicId] = useState('none');
	const [totalScore, setTotalScore] = useState(0); const [isStepFinished, setIsStepFinished] = useState(false);
	const [lastPoints, setLastPoints] = useState(0);
	const [showReport, setShowReport] = useState(false);
	const [stepResults, setStepResults] = useState<any[]>([]);

	// RAG states
	const [isSourceEnabled, setIsSourceEnabled] = useState(false);
	const [pdfPath, setPdfPath] = useState('');
	const [pdfId, setPdfId] = useState<string | null>(null);
	const [sections, setSections] = useState<{ id: string, title: string }[]>([]);
	const [selectedSection, setSelectedSection] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const fetchThemes = async () => {
			const baseUrl = getPublicApiBaseUrl();
			try {
				const response = await fetch(`${baseUrl}/api/themes`);
				if (!response.ok) throw new Error('Failed to fetch themes');
				const data = await response.json();
				setTopics([{ id: 'none', title: 'Выберите тему...', prompt: null }, ...data]);
			} catch (error) {
				console.error('Error loading themes:', error);
				setTopics([{ id: 'none', title: `Ошибка загрузки тем из ${baseUrl}`, prompt: null }]);
			} finally {
				setIsLoadingThemes(false);
			}
		};
		fetchThemes();
	}, []);
	const handleJourneyGenerated = (data: any[]) => {
		setJourney(data);
		setCurrentStep(0);
		setIsFinished(false);
		setTotalScore(0);
		setIsStepFinished(false);
		setStepResults([]);
	};

	const handleStepComplete = (isCorrect: boolean, points: number = 0, timeSpent: number = 0) => {
		if (!journey || isStepFinished) return;

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
	};

	const handleNextStep = () => {
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

	const handleBrowsePDF = async () => {
		try {
			// @ts-ignore
			const [fileHandle] = await window.showOpenFilePicker({
				types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
			});
			const file = await fileHandle.getFile();
			setPdfPath(file.name);
			// В реальном приложении здесь мы бы сохранили file объект для загрузки
			// Для упрощения в данном контексте будем использовать FormData при нажатии "Применить"
			(window as any)._selectedPdfFile = file;
		} catch (err) {
			console.error('Error picking file:', err);
		}
	};

	const handleApplyPDF = async () => {
		if (!pdfPath && !(window as any)._selectedPdfFile) return;

		setIsProcessing(true);
		const baseUrl = getPublicApiBaseUrl();
		const formData = new FormData();

		if ((window as any)._selectedPdfFile) {
			formData.append('pdf', (window as any)._selectedPdfFile);
		} else {
			// Если введен путь текстом (для Linux/сервера)
			formData.append('path', pdfPath);
		}
		formData.append('themeId', selectedTopicId);

		try {
			const response = await fetch(`${baseUrl}/api/pdf/upload`, {
				method: 'POST',
				body: formData
			});
			if (!response.ok) throw new Error('Failed to upload PDF');
			const data = await response.json();
			setPdfId(data.pdfId);
			setSections(data.sections);
			alert('PDF успешно обработан и проиндексирован!');
		} catch (error) {
			console.error('Error applying PDF:', error);
			alert('Ошибка при обработке PDF');
		} finally {
			setIsProcessing(false);
		}
	}; const renderStep = () => {
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
							<div className="w-full border-b border-gray-100 pb-4">
								<div className="flex flex-col items-center justify-center py-4 px-6 text-gray-600 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
									<div className="flex items-center gap-3 w-full max-w-md">
										<Map className="w-6 h-6 text-ubuntu-orange opacity-70" />
										<div className="relative flex-grow">
											<select
												value={selectedTopicId}
												onChange={(e) => setSelectedTopicId(e.target.value)}
												disabled={isLoadingThemes}
												className="w-full p-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-ubuntu-orange focus:border-ubuntu-orange outline-none transition-all text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
											>
												{topics.map(t => (
													<option key={t.id} value={t.id}>{t.title}</option>
												))}
											</select>
											{isLoadingThemes && (
												<div className="absolute right-3 top-1/2 -translate-y-1/2">
													<Loader2 className="w-4 h-4 animate-spin text-ubuntu-orange" />
												</div>
											)}
										</div>
									</div>

									{selectedTopicId !== 'none' && (
										<div className="mt-4 pt-4 border-t border-gray-200 w-full max-w-md">
											<label className="flex items-center gap-2 cursor-pointer group">
												<input
													type="checkbox"
													checked={isSourceEnabled}
													onChange={(e) => setIsSourceEnabled(e.target.checked)}
													className="w-4 h-4 rounded border-gray-300 text-ubuntu-orange focus:ring-ubuntu-orange"
												/>
												<span className="text-sm font-medium text-gray-700 group-hover:text-ubuntu-orange transition-colors">
													Привязка к источнику (RAG)
												</span>
											</label>

											{isSourceEnabled && (
												<div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
													<div className="flex gap-2">
														<input
															type="text"
															value={pdfPath}
															onChange={(e) => setPdfPath(e.target.value)}
															placeholder="Путь до PDF или выберите файл"
															className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none"
														/>
														<button
															onClick={handleBrowsePDF}
															className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
														>
															Обзор
														</button>
														<button
															onClick={handleApplyPDF}
															disabled={(!pdfPath && !(window as any)._selectedPdfFile) || isProcessing}
															className="px-4 py-2 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-lg text-xs font-bold disabled:bg-gray-300 transition-all flex items-center gap-2"
														>
															{isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
															{isProcessing ? 'Обработка...' : 'Применить'}
														</button>
													</div>

													{sections.length > 0 && (
														<select
															value={selectedSection || ''}
															onChange={(e) => setSelectedSection(e.target.value)}
															className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none"
														>
															<option value="">Все разделы</option>
															{sections.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
														</select>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						)}
						<div className="w-full" id="ai-assistant-container">
							<AIAssistant
								onJourneyGenerated={handleJourneyGenerated}
								resetTrigger={resetTrigger}
								topic={topic}
								onTopicDetected={setTopic}
								topicPrompt={topics.find(t => t.id === selectedTopicId)?.prompt}
								isDisabled={selectedTopicId === 'none' || isLoadingThemes}
								pdfId={isSourceEnabled ? pdfId : null}
								selectedSection={isSourceEnabled ? selectedSection : null}
								themeId={selectedTopicId}
							/>						</div>
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
				</GnomeWindow >
			</div >

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
		</main >);
};

export default KnowledgeJourney;
