import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Timer, Play, Send, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TimerFreeResponseProps {
	question: string;
	placeholder?: string;
	timerSeconds?: number;
	weight?: number;
	onComplete?: (isCorrect: boolean, points?: number, response?: string) => void;
	className?: string;
}

const TimerFreeResponse: React.FC<TimerFreeResponseProps> = ({
	question,
	placeholder = "Введите ваш развернутый ответ здесь...",
	timerSeconds = 120,
	weight = 5,
	onComplete,
	className = "my-0",
}) => {
	const [isStarted, setIsStarted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(timerSeconds);
	const [response, setResponse] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isTimeUp, setIsTimeUp] = useState(false);
	const timerRef = useRef<any>(null);

	const answered = isSubmitted || isTimeUp;

	useEffect(() => {
		if (isStarted && timeLeft > 0 && !isSubmitted) {
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
		} else if (timeLeft === 0 && !isSubmitted && isStarted) {
			setIsTimeUp(true);
			if (onComplete) onComplete(false, 0, response);
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => { if (timerRef.current) clearInterval(timerRef.current); };
	}, [isStarted, timeLeft, isSubmitted, onComplete, response]);

	const handleStart = () => setIsStarted(true);

	const handleSubmit = () => {
		if (answered || !response.trim()) return;
		setIsSubmitted(true);
		if (timerRef.current) clearInterval(timerRef.current);
		// Для свободного ответа "правильность" обычно проверяется позже (AI или учителем),
		// но здесь мы помечаем как true, если ответ дан, передавая вес.
		if (onComplete) onComplete(true, weight, response);
	};

	const handleReset = () => {
		setResponse('');
		setIsSubmitted(false);
		setIsTimeUp(false);
		setIsStarted(false);
		setTimeLeft(timerSeconds);
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
					<MessageSquare size={20} />
					<span className="font-bold text-gray-800">Развернутый ответ с таймером</span>
				</div>
				{isStarted && (
					<div className={cn("flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors", timeLeft <= 20 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600")}>
						<Timer size={16} />
						<span>{formatTime(timeLeft)}</span>
					</div>
				)}
			</div>

			<div className="space-y-4">
				<p className="font-semibold text-gray-800 text-base leading-snug">{question}</p>
				{!isStarted ? (
					<div className="py-8 flex flex-col items-center justify-center space-y-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
						<p className="text-sm text-gray-500 text-center max-w-xs">
							У вас будет {formatTime(timerSeconds)} на написание развернутого ответа.
						</p>
						<button onClick={handleStart} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md">
							<Play size={18} fill="currentColor" /> Начать
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<textarea
							value={response}
							onChange={(e) => !answered && setResponse(e.target.value)}
							disabled={answered}
							placeholder={placeholder}
							className={cn(
								"w-full h-40 p-4 rounded-xl border-2 outline-none transition-all resize-none text-sm",
								!answered && "border-blue-100 focus:border-blue-500 bg-white",
								isSubmitted && "border-green-500 bg-green-50/30",
								isTimeUp && "border-red-500 bg-red-50/30"
							)}
						/>
						
						{!answered ? (
							<div className="flex justify-between items-center">
								<span className="text-xs text-gray-400">Символов: {response.length}</span>
								<button
									onClick={handleSubmit}
									disabled={!response.trim()}
									className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm shadow-sm"
								>
									<Send size={16} />
									Отправить ответ
								</button>
							</div>
						) : (
							<div className="flex items-center justify-between pt-2">
								<p className={cn("text-sm font-medium", isSubmitted ? "text-green-700" : "text-red-700")}>
									{isSubmitted ? '✓ Ответ отправлен на проверку.' : '✗ Время вышло! Ответ не был отправлен.'}
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

export default TimerFreeResponse;
