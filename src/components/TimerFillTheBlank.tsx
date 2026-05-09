import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, Timer, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
	const timerRef = useRef<any>(null);

	const answered = isSubmitted || isTimeUp;

	const checkCorrectness = () => {
		const input = userInput.trim().toLowerCase();
		if (Array.isArray(correctAnswer)) {
			return correctAnswer.some(ans => ans.toLowerCase() === input);
		}
		return input === correctAnswer.toLowerCase();
	};

	const isCorrect = checkCorrectness();
	const parts = question.split('______');
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

	const handleReset = () => {
		setUserInput('');
		setIsSubmitted(false);
		setIsTimeUp(false);
		setIsStarted(false);
		setTimeLeft(timerSeconds);
		if (onComplete) onComplete(false);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<div className={cn("bg-white border border-blue-100 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden", className)}>
			<div className="flex items-center justify-between border-b border-blue-50 pb-4">
				<div className="flex items-center gap-2 text-blue-600">
					<HelpCircle size={20} />
					<span className="font-bold text-gray-800">Заполнение пропусков с таймером</span>
				</div>
				{isStarted && (
					<div className={cn("flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors", timeLeft <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600")}>
						<Timer size={16} />
						<span>{formatTime(timeLeft)}</span>
					</div>
				)}
			</div>

			<div className="space-y-4">
				{!isStarted ? (
					<div className="py-8 flex flex-col items-center justify-center space-y-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
						<p className="text-sm text-gray-500 text-center max-w-xs">У вас будет {timerSeconds} секунд на выполнение этого задания.</p>
						<button onClick={handleStart} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md">
							<Play size={18} fill="currentColor" /> Начать тест
						</button>
					</div>
				) : (
					<div className="space-y-6">
						<div className="font-semibold text-gray-800 text-base leading-relaxed">
							{parts[0]}
							<form onSubmit={handleSubmit} className="inline-block mx-2">
								<input
									type="text"
									value={userInput}
									onChange={(e) => !answered && setUserInput(e.target.value)}
									disabled={answered}
									placeholder="..."
									className={cn(
										"border-b-2 px-2 py-0.5 outline-none transition-colors text-center font-bold",
										!answered && "border-blue-300 focus:border-blue-600 bg-white/50",
										isSubmitted && isCorrect && "border-green-500 text-green-600 bg-green-50",
										(isSubmitted && !isCorrect || isTimeUp) && "border-red-500 text-red-600 bg-red-50"
									)}
									style={{ width: `${Math.max(displayAnswer.length + 2, 8)}ch` }}
								/>
							</form>
							{parts[1]}
						</div>

						{!answered ? (
							<div className="flex justify-end">
								<button
									onClick={() => handleSubmit()}
									disabled={!userInput.trim()}
									className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
								>
									Проверить
								</button>
							</div>
						) : (
							<div className="flex items-center justify-between pt-2">
								<p className={cn("text-sm font-medium", isCorrect ? "text-green-700" : "text-red-700")}>
									{isCorrect ? '✓ Верно!' : isTimeUp ? '✗ Время вышло!' : `✗ Неверно. Правильный ответ: ${displayAnswer}`}
								</p>
								<button onClick={handleReset} className="text-xs text-blue-600 hover:text-blue-800 underline">Попробовать снова</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default TimerFillTheBlank;
