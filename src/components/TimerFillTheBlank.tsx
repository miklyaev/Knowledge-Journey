import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, Timer, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TimerFillTheBlankProps {
	question: string;
	correctAnswer: string | string[];
	timerSeconds?: number;
	weight?: number;
	onComplete?: (isCorrect: boolean, points?: number) => void;
	className?: string;
}

const TimerFillTheBlank: React.FC<TimerFillTheBlankProps> = ({
	question,
	correctAnswer,
	timerSeconds = 60,
	weight = 1,
	onComplete,
	className = "my-0",
}) => {
	const [isStarted, setIsStarted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(timerSeconds);
	const [userInput, setUserInput] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isTimeUp, setIsTimeUp] = useState(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const answered = isSubmitted || isTimeUp;

	const checkCorrectness = () => {
		const input = userInput.trim().toLowerCase();
		if (Array.isArray(correctAnswer)) {
			return correctAnswer.some(ans => ans.toLowerCase() === input);
		}
		return input === correctAnswer.toLowerCase();
	};

	const isCorrect = checkCorrectness();
	const displayAnswer = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;

	useEffect(() => {
		if (isStarted && timeLeft > 0 && !isSubmitted) {
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
		} else if (timeLeft === 0 && !isSubmitted && isStarted) {
			setIsTimeUp(true);
			if (onComplete) onComplete(false, 0);
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => { if (timerRef.current) clearInterval(timerRef.current); };
	}, [isStarted, timeLeft, isSubmitted, onComplete]);

	const handleStart = () => setIsStarted(true);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (answered || !userInput.trim()) return;
		setIsSubmitted(true);
		if (timerRef.current) clearInterval(timerRef.current);
		if (onComplete) onComplete(isCorrect, isCorrect ? weight : 0);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<div className={cn("bg-[#f6f6f6] border border-gray-300 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden", className)}>
			<div className={cn("flex items-center border-b border-gray-200 pb-4", isStarted ? "justify-between" : "justify-end")}>
				{isStarted && (
					<div className="flex items-center gap-2 text-gray-800">
						<HelpCircle size={20} className="text-ubuntu-orange" />
						<span className="font-bold text-gray-800">Вставь пропущенное слово</span>
					</div>
				)}
				{isStarted && (
					<div className={cn("flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors", timeLeft <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-700")}>
						<Timer size={16} />
						<span>{formatTime(timeLeft)}</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{!isStarted ? (
					<div className="py-8 flex flex-col items-center justify-center space-y-4 bg-white rounded-xl border border-dashed border-gray-300">
						<p className="text-gray-500 text-sm">У вас будет {timerSeconds} секунд на выполнение этого задания.</p>
						<button
							onClick={handleStart}
							className="flex items-center gap-2 px-6 py-3 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
						>
							<Play size={18} />
							Начать тест
						</button>
					</div>
				) : (
					<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-inner">
						<div className="text-lg text-gray-800 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-4">
							{question.split(/____+/).map((part, index, array) => (
								<React.Fragment key={index}>
									<span>{part}</span>
									{index < array.length - 1 && (
										<input
											type="text"
											value={userInput}
											onChange={(e) => setUserInput(e.target.value)}
											disabled={isSubmitted || isTimeUp}
											placeholder="..."
											className={cn(
												"min-w-[120px] px-3 py-1 border-b-2 transition-all outline-none text-center font-bold",
												isSubmitted
													? (isCorrect ? "border-green-500 text-green-600 bg-green-50" : "border-red-500 text-red-600 bg-red-50")
													: "border-ubuntu-orange focus:bg-orange-50"
											)}
										/>
									)}
								</React.Fragment>
							))}
						</div>

						{(isSubmitted || isTimeUp) && (
							<div className={cn(
								"mt-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2",
								isCorrect ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
							)}>
								{isCorrect ? <CheckCircle className="shrink-0 mt-0.5" size={18} /> : <XCircle className="shrink-0 mt-0.5" size={18} />}
								<div>
									<p className="font-bold">{isCorrect ? 'Правильно!' : isTimeUp ? 'Время вышло!' : 'Не совсем так'}</p>
									<p className="text-sm opacity-90">
										Правильный ответ: <span className="font-mono font-bold">{displayAnswer}</span>
									</p>
								</div>
							</div>
						)}

						{!isSubmitted && !isTimeUp && (
							<div className="mt-8 flex justify-end">
								<button
									onClick={() => handleSubmit()}
									disabled={!userInput.trim()}
									className="px-8 py-3 bg-ubuntu-orange hover:bg-[#ff632d] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
								>
									Проверить
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default TimerFillTheBlank;
