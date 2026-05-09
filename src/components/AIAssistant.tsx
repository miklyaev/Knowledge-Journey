'use client';

import React, { useState, useEffect } from 'react';
import { Send, Bot, Sparkles, Loader2, Wifi, WifiOff } from 'lucide-react';

type AIProvider = 'yandexgpt' | 'gigachat';
type BackendStatus = 'checking' | 'online' | 'offline';

const AIAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AIProvider>('yandexgpt');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

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
    const interval = setInterval(checkStatus, 30000); // Проверка каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!prompt.trim() || backendStatus !== 'online') return;

    setIsLoading(true);
    setResponse('');

    try {
      const endpoint = provider === 'yandexgpt' ? '/api/yandexgpt/generate' : '/api/gigachat/generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data.content);
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
    <div className="flex flex-col w-full max-w-2xl mx-auto p-4 bg-slate-900/50 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-sm">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-blue-400">
            <Bot size={24} />
            <h2 className="text-xl font-bold tracking-tight">ИИ Помощник</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {backendStatus === 'checking' && (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase font-medium">Проверка связи...</span>
              </>
            )}
            {backendStatus === 'online' && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] text-green-500 uppercase font-medium">Сервер онлайн</span>
              </>
            )}
            {backendStatus === 'offline' && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-[10px] text-red-500 uppercase font-medium">Сервер недоступен</span>
              </>
            )}
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">          <button
          onClick={() => setProvider('yandexgpt')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${provider === 'yandexgpt'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-slate-400 hover:text-slate-200'
            }`}
          aria-label="Выбрать YandexGPT"
        >
          <Sparkles size={16} />
          YandexGPT
        </button>
          <button
            onClick={() => setProvider('gigachat')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${provider === 'gigachat'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
              }`}
            aria-label="Выбрать GigaChat"
          >
            <Bot size={16} />
            GigaChat
          </button>
        </div>
      </div>

      {/* Response Area */}
      <div className="min-h-[200px] mb-4 p-4 bg-slate-950/50 border border-slate-800 rounded-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm animate-pulse">Нейросеть думает...</p>
          </div>
        ) : response ? (
          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{response}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 italic">
            Задайте вопрос преподавателю...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите ваш вопрос..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !prompt.trim()}
          className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors shadow-lg"
          aria-label="Отправить запрос"
        >
          <Send size={20} />
        </button>
      </div>

      <div className="mt-3 text-[10px] text-slate-500 text-center uppercase tracking-widest">
        Powered by {provider === 'yandexgpt' ? 'Yandex Cloud' : 'Sber GigaChat'}
      </div>
    </div>
  );
};

export default AIAssistant;
