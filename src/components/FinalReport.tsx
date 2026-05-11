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
  username: string;
  topic: string;
  totalScore: number;
  onClose: () => void;
}

const FinalReport: React.FC<FinalReportProps> = ({ results, onRestart, username, topic, totalScore, onClose }) => {
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const totalTime = results.reduce((acc, r) => acc + r.timeSpent, 0);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reportData = {
        username,
        topic,
        totalScore,
        dateTime: new Date().toLocaleString('ru-RU'),
        details: results
      };

      const response = await fetch('http://localhost:3031/api/save-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        onClose();
      } else {
        alert('Ошибка при сохранении отчета');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Не удалось связаться с сервером');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-ubuntu-orange p-6 text-white text-center relative">
          <Trophy size={40} className="mx-auto mb-2 opacity-90" />
          <h2 className="text-2xl font-bold mb-1">Финальный отчёт</h2>
          <p className="text-sm opacity-90">{topic}</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Аккаунт</p>
              <p className="text-sm font-bold text-gray-800">{username}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">Дата и время</p>
              <p className="text-sm font-bold text-gray-800">{new Date().toLocaleString('ru-RU')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100">
              <p className="text-orange-600 text-[10px] uppercase font-bold mb-1">Баллы</p>
              <p className="text-xl font-black text-ubuntu-orange">{totalScore}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
              <p className="text-green-600 text-[10px] uppercase font-bold mb-1">Верно</p>
              <p className="text-xl font-black text-green-600">{correctCount}/{totalCount}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
              <p className="text-blue-600 text-[10px] uppercase font-bold mb-1">Время</p>
              <p className="text-xl font-black text-blue-600">{totalTime}с</p>
            </div>
          </div>

          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-bold text-gray-800 text-sm mb-2">Детализация:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  {result.isCorrect ? (
                    <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                  ) : (
                    <XCircle className="text-red-500 shrink-0" size={16} />
                  )}
                  <p className="text-xs text-gray-700 truncate font-medium">{result.question}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400 shrink-0 ml-2">{result.timeSpent}с</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all active:scale-[0.98]"
            >
              Закрыть
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-ubuntu-orange hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FinalReport;
