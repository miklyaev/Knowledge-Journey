import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, CheckCircle, XCircle, Timer, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Pair {
  id: string;
  text: string;
}

interface TimerMatchPairsProps {
  question: string;
  leftItems: Pair[];
  rightItems: Pair[];
  correctMapping: Record<string, string>;
  timerSeconds?: number;
  weight?: number;
  onComplete?: (isCorrect: boolean, points?: number) => void;
  className?: string;
}

const TimerMatchPairs: React.FC<TimerMatchPairsProps> = ({
  question,
  leftItems,
  rightItems,
  correctMapping,
  timerSeconds = 60,
  weight = 1,
  onComplete,
  className = "my-0",
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [shuffledRight, setShuffledRight] = useState<Pair[]>([]);
  const timerRef = useRef<any>(null);

  const answered = isSubmitted || isTimeUp;

  useEffect(() => {
    setShuffledRight([...rightItems].sort(() => Math.random() - 0.5));
  }, [rightItems]);

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

  const handleLeftClick = (id: string) => {
    if (answered) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightId: string) => {
    if (answered || !selectedLeft) return;
    const newMatches = { ...matches };
    Object.keys(newMatches).forEach(key => {
      if (newMatches[key] === rightId) delete newMatches[key];
    });
    newMatches[selectedLeft] = rightId;
    setMatches(newMatches);
    setSelectedLeft(null);
  };

  const isAllCorrect = Object.entries(matches).every(
    ([leftId, rightId]) => correctMapping[leftId] === rightId
  ) && Object.keys(matches).length === leftItems.length;

  const handleSubmit = () => {
    if (Object.keys(matches).length === leftItems.length) {
      setIsSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (onComplete) onComplete(isAllCorrect, isAllCorrect ? weight : 0);
    }
  };

  const handleReset = () => {
    setMatches({});
    setSelectedLeft(null);
    setIsSubmitted(false);
    setIsTimeUp(false);
    setIsStarted(false);
    setTimeLeft(timerSeconds);
    setShuffledRight([...rightItems].sort(() => Math.random() - 0.5));
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
          <span className="font-bold text-gray-800">Сопоставление с таймером</span>
        </div>
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {leftItems.map((item) => {
                  const matchedRightId = matches[item.id];
                  const isCorrect = isSubmitted && matchedRightId && correctMapping[item.id] === matchedRightId;
                  const isWrong = isSubmitted && matchedRightId && correctMapping[item.id] !== matchedRightId;
                  let style = 'border-gray-200 bg-white text-gray-700 hover:border-blue-300';
                  if (selectedLeft === item.id) style = 'border-blue-500 bg-blue-100 text-blue-700';
                  else if (answered) {
                    if (isCorrect) style = 'border-green-500 bg-green-50 text-green-800';
                    else if (isWrong) style = 'border-red-500 bg-red-50 text-red-800';
                  } else if (matchedRightId) style = 'border-green-200 bg-green-50 text-green-700';
                  return (
                    <button key={item.id} onClick={() => handleLeftClick(item.id)} disabled={answered} className={cn("w-full text-left px-4 py-2 rounded-xl border text-sm transition-all", style)}>
                      <div className="flex items-center justify-between">
                        <span>{item.text}</span>
                        {isCorrect && <CheckCircle size={16} className="text-green-500" />}
                        {isWrong && <XCircle size={16} className="text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {shuffledRight.map((item) => {
                  const matchedLeftId = Object.keys(matches).find(key => matches[key] === item.id);
                  const isCorrect = isSubmitted && matchedLeftId && correctMapping[matchedLeftId] === item.id;
                  const isWrong = isSubmitted && matchedLeftId && correctMapping[matchedLeftId] !== item.id;
                  let style = matchedLeftId ? (isCorrect ? 'border-green-500 bg-green-50 text-green-800' : isWrong ? 'border-red-500 bg-red-50 text-red-800' : 'border-blue-500 bg-blue-50 text-blue-700') : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300';
                  return (
                    <button key={item.id} onClick={() => handleRightClick(item.id)} disabled={answered} className={cn("w-full text-left px-4 py-2 rounded-xl border text-sm transition-all", style)}>
                      <span>{item.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {!answered ? (
              <button onClick={handleSubmit} disabled={Object.keys(matches).length !== leftItems.length} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md">Проверить пары</button>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <p className={cn("text-sm font-medium", isAllCorrect ? "text-green-700" : "text-red-700")}>
                  {isAllCorrect ? '✓ Верно!' : isTimeUp ? '✗ Время вышло!' : '✗ Есть ошибки.'}
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

export default TimerMatchPairs;
