import React, { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, Check } from 'lucide-react';

interface MultipleChoiceProps {
  question: string;
  options: string[];
  correctAnswers: number[]; // Массив индексов правильных ответов
  onSelect?: (selected: number[]) => void;
  onComplete?: (isCorrect: boolean) => void;
  className?: string;
}

const MultipleChoice: React.FC<MultipleChoiceProps> = ({
  question,
  options,
  correctAnswers,
  onSelect,
  onComplete,
  className = "my-8",
}) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const answered = isSubmitted;

  // Проверка: все ли правильные выбраны и нет ли лишних
  const isCorrect =
    selected.length === correctAnswers.length &&
    selected.every(val => correctAnswers.includes(val));

  const handleToggle = (index: number) => {
    if (answered) return;

    const newSelected = selected.includes(index)
      ? selected.filter(i => i !== index)
      : [...selected, index];

    setSelected(newSelected);
  };
  const handleSubmit = () => {
    if (selected.length > 0) {
      setIsSubmitted(true);
      if (onSelect) {
        onSelect(selected);
      }
      if (onComplete) {
        onComplete(isCorrect);
      }
    }
  };

  const handleReset = () => {
    setSelected([]);
    setIsSubmitted(false);
    if (onSelect) {
      onSelect([]);
    }
    if (onComplete) {
      onComplete(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(index);
    }
  };

  return (
    <div className={`${className} bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4`}>      <div className="flex items-start gap-3">
      <HelpCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
      <div className="space-y-2.5">
        <p className="font-semibold text-gray-800 text-base leading-snug">{question}</p>
        <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Выберите все подходящие варианты</p>
      </div>
    </div>

      <div className="space-y-2" role="group" aria-label={question}>
        {options.map((option, index) => {
          const isCurrentCorrect = correctAnswers.includes(index);
          const isCurrentSelected = selected.includes(index);

          let style = 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer';

          if (answered) {
            if (isCurrentCorrect) {
              style = 'border-green-400 bg-green-50 text-green-800 cursor-default';
            } else if (isCurrentSelected && !isCurrentCorrect) {
              style = 'border-red-400 bg-red-50 text-red-800 cursor-default';
            } else {
              style = 'border-gray-200 bg-white text-gray-400 cursor-default opacity-60';
            }
          } else if (isCurrentSelected) {
            style = 'border-blue-500 bg-blue-50/50 text-blue-700';
          }

          return (
            <div
              key={index}
              role="checkbox"
              aria-checked={isCurrentSelected}
              tabIndex={answered ? -1 : 0}
              onClick={() => handleToggle(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${style}`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isCurrentSelected ? 'bg-blue-500 border-blue-500' : 'border-current'}`}>
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
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Проверить ответ
        </button>
      ) : (
        <div className="flex items-center justify-between pt-2">
          <p className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '✓ Верно! Вы нашли все правильные ответы.' : '✗ Не совсем. Правильные ответы выделены зелёным.'}
          </p>
          <button
            onClick={handleReset}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
};

export default MultipleChoice;
