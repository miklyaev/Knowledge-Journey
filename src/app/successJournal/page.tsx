"use client";

import React, { useState, useEffect } from "react";
import { TopBar, GnomeWindow, AuthModal } from "@/components/GnomeUI";
import { useAuth } from "@/lib/AuthContext";
import { ClipboardList, Loader2, AlertCircle, Calendar, BookOpen, Award, Clock, Sparkles } from "lucide-react";

interface ReportEntry {
  username: string;
  topic: string;
  totalScore: number;
  timestamp: string;
  results?: Array<{
    question: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  details?: Array<{
    question: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

const SuccessJournalPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  const fetchReports = async (username: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3031/api/reports/${username}`);
      if (!response.ok) throw new Error("Не удалось загрузить данные");
      const data = await response.json();
      setReports(data.reverse());
    } catch (err) {
      setError("Ошибка при загрузке журнала успехов");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPoints = reports.reduce((sum, r) => sum + (r.totalScore || 0), 0);
  const totalTasks = reports.reduce((sum, r) => sum + (r.details?.length || r.results?.length || 0), 0);

  useEffect(() => {
    if (user) {
      fetchReports(user);
      setShowAuthModal(false);
    } else {
      setShowAuthModal(true);
    }
    setIsInitialCheckDone(true);
  }, [user]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  if (!isInitialCheckDone) return null;

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-[#e8e8e7]">
      <TopBar />

      <div className="flex-grow flex flex-col items-center justify-start p-4 mt-16 gap-8 w-full max-w-7xl mx-auto overflow-y-auto">
        <GnomeWindow title="Журнал успехов">
          <div className="p-6 w-full">
            {!user ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">Пожалуйста, авторизуйтесь для просмотра журнала</p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="mt-4 px-6 py-2 bg-ubuntu-orange text-white rounded-lg font-bold hover:bg-[#ff632d] transition-colors"
                >
                  Войти
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-ubuntu-orange animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Загружаем историю ваших достижений...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <ClipboardList className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-medium">У вас пока нет пройденных тестов</p>
                <p className="text-sm">Пройдите свой первый маршрут обучения, чтобы увидеть его здесь!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-ubuntu-orange" />
                            Дата
                          </div>
                        </th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-ubuntu-orange" />
                            Тема
                          </div>
                        </th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Award size={16} className="text-ubuntu-orange" />
                            Баллы
                          </div>
                        </th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-ubuntu-orange" />
                            Заданий
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reports.map((report, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-orange-50/30 transition-colors group"
                        >
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {report.timestamp}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">
                            {report.topic}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-ubuntu-orange/10 text-ubuntu-orange border border-ubuntu-orange/20">
                              {report.totalScore}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {report.details?.length || report.results?.length || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Итоговая строка */}
                <div className="flex items-center justify-start gap-12 px-12 py-4 bg-gray-50/50 rounded-xl border border-gray-100 ml-[-25px]">
                  <div className="flex items-center gap-4 min-w-[100px]">
                    <span className="text-sm font-bold text-ubuntu-orange uppercase tracking-wider">Итого</span>
                  </div>
                  <div className="flex items-center gap-20 flex-grow justify-around">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1 tracking-tight">всего баллов</span>
                      <span className="text-base font-black text-gray-700">{totalPoints}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1 tracking-tight">всего заданий</span>
                      <span className="text-base font-black text-gray-700">{totalTasks}</span>
                    </div>
                  </div>
                </div>

                {/* Бонусное сообщение */}
                <div className="mt-8 flex justify-center">
                  <div className="relative group cursor-default">
                    {/* Сияющий фон с анимацией вращения и пульсации */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-ubuntu-orange via-yellow-400 to-ubuntu-orange rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

                    <div className="relative px-8 py-4 bg-white rounded-full border border-ubuntu-orange/20 shadow-xl flex items-center gap-3 overflow-hidden">
                      {/* Анимированные искры на фоне */}
                      <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-1 h-1 bg-ubuntu-orange rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                        <div className="absolute bottom-2 right-1/3 w-1 h-1 bg-ubuntu-orange rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
                        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-ubuntu-orange rounded-full animate-ping" style={{ animationDelay: '1.2s' }}></div>
                      </div>

                      <div className="relative flex items-center gap-3">
                        <div className="p-2 bg-ubuntu-orange/10 rounded-full animate-bounce">
                          <Sparkles size={20} className="text-ubuntu-orange" />
                        </div>
                        <p className="text-base font-medium text-gray-700 tracking-tight">
                          При достижении <span className="font-black text-ubuntu-orange text-lg drop-shadow-sm">1 000 баллов</span> вас ждёт бонус!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>              </div>
            )}
          </div>
        </GnomeWindow>
      </div>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          title="Вход в журнал успехов"
        />
      )}
    </main>
  );
};

export default SuccessJournalPage;
