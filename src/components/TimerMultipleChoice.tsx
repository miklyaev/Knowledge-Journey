import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, Check, Timer, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TimerMultipleChoiceProps {
	question: string;
	options: string[];
	correctAnswers: number[];
	timerSeconds?: number;
	weight?: number;
	onComplete?: (isCorrect: boolean, points?: number, timeSpent?: number) => void;
	className?: string;
}

const TimerMultipleChoice: React.FC<TimerMultipleChoiceProps> = ({
	question,
	options,
	correctAnswers,
	timerSeconds = 60,
	weight = 1,
	onComplete,
	className = "my-0",
}) => {
	const [isStarted, setIsStarted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(timerSeconds);
	const [selected, setSelected] = useState<number[]>([]);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isTimeUp, setIsTimeUp] = useState(false);
	const [startTime, setStartTime] = useState<number | null>(null);

	const timerRef = useRef<any>(null);

	const answered = isSubmitted || isTimeUp;

	const isCorrect =
		selected.length === correctAnswers.length &&
		selected.every(val => correctAnswers.includes(val));

	useEffect(() => {
		if (isStarted && timeLeft > 0 && !isSubmitted) {
			if (!startTime) setStartTime(Date.now());
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
		} else if (timeLeft === 0 && !isSubmitted && isStarted) {
			setIsTimeUp(true);
			const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : timerSeconds;
			if (onComplete) onComplete(false, 0, timeSpent);
			if (timerRef.current) clearInterval(timerRef.current);
		}

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isStarted, timeLeft, isSubmitted, onComplete, startTime, timerSeconds]);

	const handleStart = () => {
		setIsStarted(true);
		setStartTime(Date.now());
	};

	const handleToggle = (index: number) => {
		if (answered) return;

		const newSelected = selected.includes(index)
			? selected.filter(i => i !== index)
			: [...selected, index];

		setSelected(newSelected);
	};

	const handleSubmit = () => {
		if (selected.length > 0 && !answered) {
			setIsSubmitted(true);
			if (timerRef.current) clearInterval(timerRef.current);

			const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

			if (onComplete) {
				onComplete(isCorrect, isCorrect ? weight : 0, timeSpent);
			}
		}
	};
	const handleReset = () => {
		setSelected([]);
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
		<div className={cn("bg-[#f6f6f6] border border-gray-300 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden", className)}>
			<div className={cn("flex items-center border-b border-gray-200 pb-4", isStarted ? "justify-between" : "justify-end")}>
				{isStarted && (
					<div className="flex items-center gap-2 text-gray-800">
						<HelpCircle size={20} className="text-ubuntu-orange" />
						<span className="font-bold text-gray-800">Множественный выбор</span>
					</div>
				)}
				{isStarted && (
					<div className={cn(
						"flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors",
						timeLeft <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-200 text-gray-700"
					)}>
						<Timer size={16} />
						<span>{formatTime(timeLeft)}</span>
					</div>
				)}
			</div>

			<div className="space-y-4">
				<p className="font-semibold text-gray-800 text-base leading-snug">{question}</p>
				{!isStarted ? (
					<div className="py-8 flex flex-col items-center justify-center space-y-4 bg-white rounded-xl border border-dashed border-gray-300">
						<p className="text-sm text-gray-500 text-center max-w-xs">
							У вас будет {timerSeconds} секунд на выполнение этого задания.
						</p>						<button
							onClick={handleStart}
							className="flex items-center gap-2 px-8 py-3 bg-ubuntu-orange text-white rounded-xl font-bold hover:bg-[#ff632d] transition-all transform active:scale-95 shadow-md"
						>
							<Play size={18} fill="currentColor" />
							Начать тест
						</button>
					</div>
				) : (
					<div className="space-y-6">
						<div className="space-y-2" role="group">
							{options.map((option, index) => {
								const isCurrentCorrect = correctAnswers.includes(index);
								const isCurrentSelected = selected.includes(index);

								let style = 'border-gray-200 bg-white text-gray-700 hover:border-ubuntu-orange/50 hover:bg-ubuntu-orange/5 cursor-pointer';

								if (answered) {
									if (isCurrentCorrect) {
										style = 'border-green-500 bg-green-50 text-green-800 cursor-default';
									} else if (isCurrentSelected && !isCurrentCorrect) {
										style = 'border-red-500 bg-red-50 text-red-800 cursor-default';
									} else {
										style = 'border-gray-200 bg-white text-gray-400 cursor-default opacity-60';
									}
								} else if (isCurrentSelected) {
									style = 'border-ubuntu-orange bg-ubuntu-orange/10 text-ubuntu-orange';
								}

								return (
									<div
										key={index}
										onClick={() => handleToggle(index)}
										className={cn(
											"w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 focus:outline-none",
											style
										)}
									>
										<div className={cn(
											"w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
											isCurrentSelected ? 'bg-ubuntu-orange border-ubuntu-orange' : 'border-gray-300'
										)}>
											{isCurrentSelected && <Check size={14} className="text-white stroke-[3]" />}
										</div>
										<span className="flex-1">{option}</span>
										{answered && isCurrentCorrect && (
											<CheckCircle size={16} className="ml-auto text-green-500 shrink-0" />
										)}
										{answered && isCurrentSelected && !isCurrentCorrect && (
											<XCircle size={16} className="ml-auto text-red-500 shrink-0" />
										)}
									</div>
								);
							})}
						</div>

						{!answered ? (
							<button
								onClick={handleSubmit}
								disabled={selected.length === 0}
								className="w-full py-3 bg-ubuntu-orange text-white rounded-xl font-bold text-sm hover:bg-[#ff632d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
							>
								Проверить ответ
							</button>
						) : (
							<div className="flex items-center justify-between pt-2">
								<p className={cn(
									"text-sm font-medium",
									isCorrect ? "text-green-700" : "text-red-700"
								)}>
									{isCorrect
										? '✓ Верно!'
										: isTimeUp
											? '✗ Время вышло!'
											: '✗ Не совсем верно.'}
								</p>
							</div>
						)}					</div>
				)}
			</div>
		</div>
	);
};

export default TimerMultipleChoice;