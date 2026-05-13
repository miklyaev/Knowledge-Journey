import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Timer, Play, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TimerFreeResponseProps {
	question: string;
	timerSeconds?: number;
	onComplete?: (isCorrect: boolean, points?: number, timeSpent?: number) => void;
	className?: string;
}

const TimerFreeResponse: React.FC<TimerFreeResponseProps> = ({
	question,
	timerSeconds = 120,
	onComplete,
	className = "my-0",
}) => {
	const [isStarted, setIsStarted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(timerSeconds);
	const [userInput, setUserInput] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
	const [isTimeUp, setIsTimeUp] = useState(false);
	const [startTime, setStartTime] = useState<number | null>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const answered = result !== null || isTimeUp;

	useEffect(() => {
		if (isStarted && timeLeft > 0 && !answered && !isSubmitting) {
			if (!startTime) setStartTime(Date.now());
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
		} else if (timeLeft === 0 && !answered && isStarted) {
			setIsTimeUp(true);
			const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : timerSeconds;
			if (onComplete) onComplete(false, 2, timeSpent);
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => { if (timerRef.current) clearInterval(timerRef.current); };
	}, [isStarted, timeLeft, answered, isSubmitting, onComplete, startTime, timerSeconds]);

	const handleStart = () => {
		setIsStarted(true);
		setStartTime(Date.now());
	};

	const handleSubmit = async () => {
		if (answered || isSubmitting || !userInput.trim()) return;

		setIsSubmitting(true);
		if (timerRef.current) clearInterval(timerRef.current);

		const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

		try {
			const res = await fetch(`${getPublicApiBaseUrl()}/api/ai/evaluate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question, answer: userInput }),
			});
			const data = await res.json();
			setResult(data);

			if (onComplete) {
				onComplete(data.score > 5, data.score, timeSpent);
			}
		} catch (error) {
			console.error('Evaluation error:', error);
			setResult({ score: 2, feedback: "Не удалось получить оценку от ИИ. Начислено 2 балла." });
			if (onComplete) onComplete(false, 2, timeSpent);
		} finally {
			setIsSubmitting(false);
		}
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
						<span className="font-bold text-gray-800">Развернутый ответ</span>
					</div>
				)}
				{isStarted && !result && (
					<div className={cn("flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors", timeLeft <= 20 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-700")}>
						<Timer size={16} />
						<span>{formatTime(timeLeft)}</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{!isStarted ? (
					<div className="py-8 flex flex-col items-center justify-center space-y-4 bg-white rounded-xl border border-dashed border-gray-300">
						<p className="text-gray-500 text-sm text-center px-6">
							Это творческое задание. Ваш ответ будет проверен нейросетью.<br />
							У вас будет {timerSeconds} секунд.
						</p>
						<button
							onClick={handleStart}
							className="flex items-center gap-2 px-6 py-3 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
						>
							<Play size={18} />
							Начать выполнение
						</button>
					</div>
				) : (
					<div className="bg-white p-6 rounded-xl border border-gray-200 shadow-inner">
						<p className="text-lg font-bold text-gray-800 mb-4">{question}</p>

						<textarea
							value={userInput}
							onChange={(e) => setUserInput(e.target.value)}
							disabled={answered || isSubmitting}
							placeholder="Введите ваш ответ здесь..."
							className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ubuntu-orange/20 focus:border-ubuntu-orange transition-all resize-none text-gray-700"
						/>

						{isSubmitting && (
							<div className="mt-4 flex items-center justify-center gap-3 text-ubuntu-orange">
								<Loader2 className="animate-spin" size={20} />
								<span className="text-sm font-bold animate-pulse">Нейросеть проверяет ваш ответ...</span>
							</div>
						)}

						{result && (
							<div className={cn(
								"mt-6 p-5 rounded-xl border animate-in fade-in slide-in-from-top-2",
								result.score > 5 ? "bg-green-50 border-green-100 text-green-800" : "bg-orange-50 border-orange-100 text-orange-800"
							)}>
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2 font-bold">
										{result.score > 5 ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
										<span>Оценка: {result.score} / 10</span>
									</div>
								</div>
								<p className="text-sm leading-relaxed opacity-90">{result.feedback}</p>
							</div>
						)}

						{isTimeUp && !result && (
							<div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
								<AlertCircle size={20} />
								<span className="font-bold">Время вышло! Начислено 2 балла.</span>
							</div>
						)}

						{!answered && !isSubmitting && (
							<div className="mt-6 flex justify-end">
								<button
									onClick={handleSubmit}
									disabled={!userInput.trim()}
									className="flex items-center gap-2 px-8 py-3 bg-ubuntu-orange hover:bg-[#ff632d] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
								>
									<Send size={18} />
									Отправить на проверку
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default TimerFreeResponse;
