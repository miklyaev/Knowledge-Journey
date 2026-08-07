'use client';

import React, { useState, useEffect } from 'react';
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AIProvider = 'yandexgpt' | 'gigachat';
type BackendStatus = 'checking' | 'online' | 'offline';

interface AIAssistantProps {
  onJourneyGenerated?: (journey: any[]) => void;
  resetTrigger?: number;
  topic?: string;
  onTopicDetected?: (topic: string) => void;
  topicPrompt?: string | null;
  isDisabled?: boolean;
  pdfId?: string | null;
  selectedSection?: string | null;
  themeId?: string;
  pendingSectionTitle?: string | null;
  onSectionTitleHandled?: () => void;
  pendingRecommendedSectionTitle?: string | null;
  onRecommendedSectionTitleHandled?: () => void;
}
const AIAssistant: React.FC<AIAssistantProps> = ({
  onJourneyGenerated,
  resetTrigger,
  topic,
  onTopicDetected,
  topicPrompt,
  isDisabled,
  pdfId,
  selectedSection,
  themeId,
  pendingSectionTitle,
  onSectionTitleHandled,
  pendingRecommendedSectionTitle,
  onRecommendedSectionTitleHandled
}) => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AIProvider>('yandexgpt');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    if (pendingSectionTitle && onSectionTitleHandled) {
      setPrompt(prev => {
        const text = `Расскажи подробнее про раздел: ${pendingSectionTitle}`;
        return prev ? `${prev}\n\n${text}` : text;
      });
      onSectionTitleHandled();
    }
  }, [pendingSectionTitle, onSectionTitleHandled]);

  useEffect(() => {
    if (pendingRecommendedSectionTitle && onRecommendedSectionTitleHandled) {
      setPrompt(prev => {
        const text = `Расскажи подробнее про раздел: ${pendingRecommendedSectionTitle}`;
        return prev ? `${prev}\n\n${text}` : text;
      });
      onRecommendedSectionTitleHandled();
    }
  }, [pendingRecommendedSectionTitle, onRecommendedSectionTitleHandled]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      // Вместо очистки добавляем вопрос в конец текущего ответа
      setResponse(prev => prev + `\n\n---\nМы изучаем тему: ${topic || 'выбранную ранее'}. Что вы еще хотите узнать или уточнить по этой теме?`);
      setPrompt('');
    }
  }, [resetTrigger, topic]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!prompt.trim() || backendStatus !== 'online' || isDisabled) return;

    // Если тема еще не задана, считаем текущий промпт темой
    if (!topic && onTopicDetected) {
      onTopicDetected(prompt.trim());
    }

    setIsLoading(true);
    setResponse('');

    try {
      const endpoint = provider === 'yandexgpt' ? '/api/yandexgpt/generate' : '/api/gigachat/generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          topicPrompt: topicPrompt && topicPrompt !== 'в разработке' ? topicPrompt : undefined,
          pdfId,
          selectedSection,
          themeId
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const content = data.content;

        // Поиск JSON в ответе
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

        // Очистка текста от JSON блока для отображения пользователю
        const cleanText = content.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
        setResponse(cleanText);

        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.journey && Array.isArray(parsed.journey) && onJourneyGenerated) {
              onJourneyGenerated(parsed.journey);
            }
          } catch (e) {
            console.error('Failed to parse journey JSON:', e);
          }
        }
      } else {
        setResponse(`Ошибка: ${data.error || 'Не удалось получить ответ'}`);
      }
    } catch (error) {
      setResponse('Произошла ошибка при соединении с сервером.');
      console.error('AI Request Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-full mx-auto p-6 bg-[#f6f6f6] border border-gray-300 rounded-2xl shadow-sm">
      {/* Header & Toggle */}
      <div className="flex items-end justify-between mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2 text-gray-800">
            <Bot size={22} className="text-ubuntu-orange mb-[10px]" />
            <h2 className="text-lg font-bold tracking-tight leading-none">Интерактивный помощник обучения</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {backendStatus === 'checking' && (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="text-[10px] text-gray-500 uppercase font-bold">Связь...</span>
              </>
            )}
            {backendStatus === 'online' && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-green-600 uppercase font-bold">Нейросеть готова</span>
              </>
            )}
            {backendStatus === 'offline' && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-red-600 uppercase font-bold">Оффлайн</span>
              </>
            )}
          </div>
        </div>

        <div className="flex bg-gray-200/80 p-1 rounded-xl border border-gray-300 shadow-inner relative w-64">
          <div
            className={cn(
              "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-md transition-all duration-300 ease-out border border-gray-100",
              provider === 'yandexgpt' ? "left-1" : "left-[calc(50%+2px)]"
            )}
          />
          <button
            onClick={() => setProvider('yandexgpt')}
            className={cn(
              "relative z-10 flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2",
              provider === 'yandexgpt' ? "text-ubuntu-orange" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Sparkles size={14} />
            YandexGPT
          </button>
          <button
            onClick={() => setProvider('gigachat')}
            className={cn(
              "relative z-10 flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2",
              provider === 'gigachat' ? "text-ubuntu-orange" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Bot size={14} />
            GigaChat
          </button>
        </div>
      </div>

      {/* Response Area */}
      <div className="min-h-[200px] mb-6 p-5 bg-white border border-gray-200 rounded-xl overflow-y-auto shadow-inner">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 className="animate-spin text-ubuntu-orange" size={28} />
            <p className="text-xs font-medium animate-pulse">Обработка запроса...</p>
          </div>
        ) : response ? (
          <div className="prose prose-slate max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">{response}</p>
            {pdfId && (
              <div className="mt-4 pt-2 border-t border-gray-100 text-[10px] text-gray-400 italic">
                Источник: База знаний {selectedSection ? `(раздел: ${selectedSection})` : ''}
              </div>
            )}
          </div>) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <Sparkles size={32} className="opacity-10" />
            <p className="text-sm italic">Задайте вопрос по учебному материалу...</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative group" id="ai-assistant-input-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? "Выберите доступную тему выше..." : "Введите ваш вопрос..."}
          disabled={isDisabled}
          className={cn(
            "w-full bg-white border border-gray-300 rounded-xl pl-4 pr-14 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ubuntu-orange/20 focus:border-ubuntu-orange transition-all resize-none shadow-sm",
            isDisabled && "bg-gray-100 cursor-not-allowed opacity-60"
          )}
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !prompt.trim() || isDisabled}
          className="absolute right-[10px] bottom-[14.4px] p-2.5 bg-ubuntu-orange hover:bg-[#ff632d] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-all shadow-md active:scale-95"
          aria-label="Отправить"
        >
          <Send size={18} />
        </button>
      </div>
      <div className="mt-4 text-[9px] text-gray-400 text-center uppercase tracking-[0.2em] font-bold">
        Интеллектуальный модуль: {provider === 'yandexgpt' ? 'Yandex Cloud' : 'Sber GigaChat'}
      </div>
    </div>
  );
};

export default AIAssistant;
