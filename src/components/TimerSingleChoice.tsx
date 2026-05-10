import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, Timer, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimerSingleChoiceProps {
  question: string;
  options: string[];
  correctAnswer: number;
  timerSeconds?: number;
  weight?: number;
  onSelect?: (index: number) => void;
  onComplete?: (isCorrect: boolean, points?: number) => void;
  className?: string;
}

const TimerSingleChoice: React.FC<TimerSingleChoiceProps> = ({
  question,
  options,
  correctAnswer,
  timerSeconds = 60,
  weight = 1,
  onSelect,
  onComplete,
  className = "my-0",
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [selected, setSelected] = useState<number | null>(null);
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
      if (onComplete) onComplete(false, 0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, timeLeft, selected, onComplete]);

  const handleStart = () => setIsStarted(true);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    if (timerRef.current) clearInterval(timerRef.current);
    if (onSelect) onSelect(index);
    if (onComplete) onComplete(index === correctAnswer, index === correctAnswer ? weight : 0);
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

  return (
    <div className={cn("bg-white border border-blue-100 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden", className)}>
      <div className={cn("flex items-center border-b border-blue-50 pb-4", isStarted ? "justify-between" : "justify-end")}>
        {isStarted && (
          <div className="flex items-center gap-2 text-blue-600">
            <HelpCircle size={20} />
            <span className="font-bold text-gray-800">Одиночный выбор</span>
          </div>
        )}
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
          <div className="space-y-2">
            {options.map((option, index) => {
              const isCurrentCorrect = index === correctAnswer;
              const isCurrentSelected = index === selected;
              let style = 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer';
              if (answered) {
                if (isCurrentCorrect) style = 'border-green-400 bg-green-50 text-green-800 cursor-default';
                else if (isCurrentSelected) style = 'border-red-400 bg-red-50 text-red-800 cursor-default';
                else style = 'border-gray-200 bg-white text-gray-400 cursor-default opacity-60';
              }
              return (
                <div key={index} onClick={() => handleSelect(index)} className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 focus:outline-none", style)}>
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center shrink-0 text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {answered && isCurrentCorrect && <CheckCircle size={16} className="ml-auto text-green-500 shrink-0" />}
                  {answered && isCurrentSelected && !isCurrentCorrect && <XCircle size={16} className="ml-auto text-red-500 shrink-0" />}
                </div>
              );
            })}
            {answered && (
              <div className="flex items-center justify-between pt-4">
                <p className={cn("text-sm font-medium", isCorrect ? "text-green-700" : "text-red-700")}>
                  {isCorrect ? '✓ Верно!' : isTimeUp ? '✗ Время вышло!' : '✗ Неверно.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerSingleChoice;
