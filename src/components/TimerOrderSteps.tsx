import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, CheckCircle, XCircle, Timer, Play, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimerOrderStepsProps {
  question: string;
  steps: string[];
  correctOrder: string[];
  timerSeconds?: number;
  weight?: number;
  onComplete?: (isCorrect: boolean, points?: number, timeSpent?: number) => void;
  className?: string;
}

const TimerOrderSteps: React.FC<TimerOrderStepsProps> = ({
  question,
  steps,
  correctOrder,
  timerSeconds = 60,
  weight = 1,
  onComplete,
  className = "my-0",
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  const answered = isSubmitted || isTimeUp;
  const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);

  useEffect(() => {
    setCurrentOrder([...steps].sort(() => Math.random() - 0.5));
  }, [steps]);

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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStarted, timeLeft, isSubmitted, onComplete, startTime, timerSeconds]);

  const handleStart = () => {
    setIsStarted(true);
    setStartTime(Date.now());
  };

  const handleMoveUp = (index: number) => {
    if (answered || index === 0) return;
    const newOrder = [...currentOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setCurrentOrder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (answered || index === currentOrder.length - 1) return;
    const newOrder = [...currentOrder];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setCurrentOrder(newOrder);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    if (onComplete) onComplete(isCorrect, isCorrect ? weight : 0, timeSpent);
  };
  const handleReset = () => {
    setCurrentOrder([...steps].sort(() => Math.random() - 0.5));
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
      <div className={cn("flex items-center border-b border-blue-50 pb-4", isStarted ? "justify-between" : "justify-end")}>
        {isStarted && (
          <div className="flex items-center gap-2 text-blue-600">
            <HelpCircle size={20} />
            <span className="font-bold text-gray-800">Порядок шагов</span>
          </div>
        )}
        {isStarted && (
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold transition-colors", timeLeft <= 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600")}>
            <Timer size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="font-semibold text-gray-800 text-base leading-snug">{question}</p>
        {!isStarted ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-500 text-center max-w-xs">У вас будет {timerSeconds} секунд на выполнение этого задания.</p>
            <button onClick={handleStart} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md">
              <Play size={18} fill="currentColor" /> Начать тест
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentOrder.map((step, index) => {
              const isStepInCorrectPlace = isSubmitted && step === correctOrder[index];
              const isStepInWrongPlace = isSubmitted && step !== correctOrder[index];
              let stateStyle = 'border-gray-200 bg-white text-gray-700';
              if (isStepInCorrectPlace) stateStyle = 'border-green-500 bg-green-50 text-green-800';
              if (isStepInWrongPlace) stateStyle = 'border-red-500 bg-red-50 text-red-800';
              return (
                <div key={step} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all", stateStyle)}>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!answered && (
                      <>
                        <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-blue-100 rounded disabled:opacity-30">
                          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => handleMoveDown(index)} disabled={index === currentOrder.length - 1} className="p-1 hover:bg-blue-100 rounded disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </>
                    )}
                    {answered && <div className="w-6 h-6 flex items-center justify-center font-bold text-sm">{index + 1}</div>}
                  </div>
                  <GripVertical size={20} className="text-gray-300 shrink-0" />
                  <span className="flex-1 text-sm">{step}</span>
                  {isStepInCorrectPlace && <CheckCircle size={18} className="text-green-500 shrink-0" />}
                  {isStepInWrongPlace && <XCircle size={18} className="text-red-500 shrink-0" />}
                </div>
              );
            })}
            {!answered ? (
              <button onClick={handleSubmit} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md">Проверить порядок</button>
            ) : (
              <div className="flex items-center justify-between pt-2">
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

export default TimerOrderSteps;
