'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, RotateCcw, Trophy } from 'lucide-react';

interface FinalReportProps {
  results: {
    question: string;
    isCorrect: boolean;
    timeSpent: number;
  }[];
  onRestart: () => void;
}

const FinalReport: React.FC<FinalReportProps> = ({ results, onRestart }) => {
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const totalTime = results.reduce((acc, r) => acc + r.timeSpent, 0);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-ubuntu-orange p-8 text-white text-center">
        <Trophy size={48} className="mx-auto mb-4 opacity-90" />
        <h2 className="text-3xl font-bold mb-2">Путешествие завершено!</h2>
        <p className="opacity-80">Вы успешно прошли все этапы проверки знаний</p>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Результат</p>
            <p className="text-2xl font-black text-ubuntu-orange">{percentage}%</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Верно</p>
            <p className="text-2xl font-black text-green-600">{correctCount}/{totalCount}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Время</p>
            <p className="text-2xl font-black text-blue-600">{totalTime}с</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-bold text-gray-800 mb-4">Детализация этапов:</h3>
          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 overflow-hidden">
                {result.isCorrect ? (
                  <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                ) : (
                  <XCircle className="text-red-500 shrink-0" size={20} />
                )}
                <p className="text-sm text-gray-700 truncate font-medium">{result.question}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-400 shrink-0 ml-4">
                <Clock size={14} />
                <span className="text-xs font-bold">{result.timeSpent}с</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
        >
          <RotateCcw size={18} />
          Начать новое путешествие
        </button>
      </div>
    </div>
  );
};

export default FinalReport;
