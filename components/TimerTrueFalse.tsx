import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, Timer, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TimerTrueFalseProps {
	question: string;
	correctAnswer: boolean;
	explanation: string;
	timerSeconds?: number;
	onComplete?: (isCorrect: boolean) => void;
	className?: string;
}

const TimerTrueFalse: React.FC<TimerTrueFalseProps> = ({
	question,
	correctAnswer,
	explanation,
	timerSeconds = 60,
	onComplete,
	className = "my-0",
}) => {
	const [isStarted, setIsStarted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(timerSeconds);
	const [selected, setSelected] = useState<boolean | null>(null);
	const [isTimeUp, setIsTimeUp] = useState(false);
	const timerRef = useRef<any>(null);

	const answered = selected !== null || isTimeUp;
	const isCorrect = selected === correctAnswer;

	useEffect(() => {
		if (isStarted && timeLeft > 0 && selected === null) {
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => prev - 1);
			}, 1000);
		} else if (timeLeft === 0 && selected === null && isStarted) {
			setIsTimeUp(true);
			if (onComplete) onComplete(false);
			if (timerRef.current) clearInterval(timerRef.current);
		}

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isStarted, timeLeft, selected, onComplete]);

	const handleStart = () => setIsStarted(true);

	const handleSelect = (value: boolean) => {
		if (answered) return;
		setSelected(value);
		if (timerRef.current) clearInterval(timerRef.current);
		if (onComplete) onComplete(value === correctAnswer);
	};

	const handleReset = () => {
		setSelected(null);
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

	const options = [
		{ label: 'Верно', value: true },
		{ label: 'Неверно', value: false },
	];

	return (
		<div className={cn("bg-white border border-blue-100 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden", className)}>
			<div className="flex items-center justify-between border-b border-blue-50 pb-4">
				<div className="flex items-center gap-2 text-blue-600">
					<HelpCircle size={20} />
					<span className="font-bold text-gray-800">Верно/Неверно с таймером</span>
				</div>
				{isStarted && (
					<div className={cn(
						"flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors",
						timeLeft <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
					)}>
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
							У вас будет {timerSeconds} секунд на выполнение этого задания.
						</p>
						<button onClick={handleStart} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md">
							<Play size={18} fill="currentColor" />
							Начать тест
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							{options.map((option) => {
								const isCurrentSelected = selected === option.value;
								const isCurrentCorrect = option.value === correctAnswer;
								let style = 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer';
								if (answered) {
									if (isCurrentCorrect) style = 'border-green-400 bg-green-50 text-green-800 cursor-default';
									else if (isCurrentSelected) style = 'border-red-400 bg-red-50 text-red-800 cursor-default';
									else style = 'border-gray-200 bg-white text-gray-400 cursor-default opacity-60';
								}
								return (
									<div key={option.label} onClick={() => handleSelect(option.value)} className={cn("text-center px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none", style)}>
										{option.label}
										{answered && isCurrentCorrect && <CheckCircle size={16} className="text-green-500 shrink-0" />}
										{answered && isCurrentSelected && !isCurrentCorrect && <XCircle size={16} className="text-red-500 shrink-0" />}
									</div>
								);
							})}
						</div>
						{answered && (
							<div className="space-y-3 pt-4 border-t border-blue-50">
								<div className="flex items-center justify-between">
									<p className={cn("text-sm font-bold", isCorrect ? "text-green-700" : "text-red-700")}>
										{isCorrect ? '✓ Верно!' : isTimeUp ? '✗ Время вышло!' : '✗ Неверно.'}
									</p>
									<button onClick={handleReset} className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2">
										Попробовать снова
									</button>
								</div>
								<div className="bg-gray-50 p-3 rounded-lg border border-blue-100/50">
									<p className="text-sm text-gray-700 leading-relaxed">
										<span className="font-semibold">Объяснение:</span> {explanation}
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default TimerTrueFalse;
