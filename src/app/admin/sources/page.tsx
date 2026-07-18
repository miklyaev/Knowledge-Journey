"use client";

import React, { useState, useEffect } from "react";
import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import { getPublicApiBaseUrl } from "@/lib/apiBase";
import { Loader2, FileText, Save, Search, CheckCircle2, Trash2, Database, Brain, FileSearch } from "lucide-react";

interface Topic {
    id: string;
    title: string;
}

interface ChunkStep {
    label: string;
    icon: React.ReactNode;
    status: "done" | "active" | "pending";
}

const STEPS: ChunkStep[] = [
    { label: "Парсинг PDF", icon: <FileSearch size={16} />, status: "pending" },
    { label: "Извлечение разделов", icon: <FileText size={16} />, status: "pending" },
    { label: "Чанкинг текста", icon: <Brain size={16} />, status: "pending" },
    { label: "Векторизация в ChromaDB", icon: <Database size={16} />, status: "pending" },
];

const AdminSourcesPage = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState("none");
    const [pdfPath, setPdfPath] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [chunkSteps, setChunkSteps] = useState<ChunkStep[]>(STEPS);
    const [sections, setSections] = useState<{ id: string, title: string }[]>([]);
    const [pdfId, setPdfId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        if (isAuthorized) {
            fetchThemes();
        }
    }, [isAuthorized]);

    const fetchThemes = async () => {
        const baseUrl = getPublicApiBaseUrl();
        try {
            const response = await fetch(`${baseUrl}/api/themes`);
            const data = await response.json();
            setTopics(data);
        } catch (error) {
            console.error("Error loading themes:", error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const baseUrl = getPublicApiBaseUrl();
        try {
            const response = await fetch(`${baseUrl}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password }),
            });
            const data = await response.json();
            if (response.ok) {
                setIsAuthorized(true);
            } else {
                setError(data.error || "Ошибка авторизации");
            }
        } catch (err) {
            setError("Ошибка соединения с сервером");
        }
    };

    const handleBrowsePDF = async () => {
        try {
            // @ts-ignore
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
            });
            const file = await fileHandle.getFile();
            setPdfPath(file.name);
            (window as any)._adminSelectedPdfFile = file;
        } catch (err) {
            console.error('Error picking file:', err);
        }
    };

    const animateSteps = async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

        setChunkSteps(STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" as const : "pending" as const })));
        await delay(400);

        for (let i = 0; i < STEPS.length; i++) {
            setChunkSteps(prev => prev.map((s, j) => ({
                ...s,
                status: j < i + 1 ? ("done" as const) : j === i + 1 ? ("active" as const) : ("pending" as const)
            })));
            await delay(i < STEPS.length - 1 ? 500 : 300);
        }
    };

    const handleApplyPDF = async () => {
        if (selectedTopicId === "none") {
            alert("Выберите тему");
            return;
        }
        if (!pdfPath && !(window as any)._adminSelectedPdfFile) return;

        setIsProcessing(true);
        setSuccessMessage("");
        setSections([]);
        setChunkSteps(STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" as const : "pending" as const })));
        const baseUrl = getPublicApiBaseUrl();
        const formData = new FormData();

        if ((window as any)._adminSelectedPdfFile) {
            formData.append('pdf', (window as any)._adminSelectedPdfFile);
        } else {
            formData.append('path', pdfPath);
        }
        formData.append('themeId', selectedTopicId);

        try {
            const response = await fetch(`${baseUrl}/api/pdf/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to upload PDF');
            }
            setPdfId(data.pdfId);
            setSections(data.sections);
            setSuccessMessage("PDF успешно привязан к теме!");
            animateSteps();
        } catch (error: any) {
            console.error('Error applying PDF:', error);
            setChunkSteps(STEPS.map(s => ({ ...s, status: "pending" as const })));
            alert(`Ошибка: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearTheme = async () => {
        if (selectedTopicId === "none") {
            alert("Выберите тему");
            return;
        }
        const topicName = topics.find(t => t.id === selectedTopicId)?.title || selectedTopicId;
        if (!confirm(`Очистить все векторы и данные темы "${topicName}" из ChromaDB? Это действие необратимо.`)) return;

        setIsClearing(true);
        const baseUrl = getPublicApiBaseUrl();
        try {
            const response = await fetch(`${baseUrl}/api/pdf/clear-theme`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themeId: selectedTopicId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear theme');
            }
            setPdfId(null);
            setSections([]);
            setSuccessMessage(`Данные темы "${topicName}" очищены из ChromaDB и MySQL`);
        } catch (error: any) {
            console.error('Error clearing theme:', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            setIsClearing(false);
        }
    };

    if (!isAuthorized) {
        return (
            <main className="h-screen w-screen overflow-hidden flex flex-col bg-[#e8e8e7]">
                <TopBar />
                <div className="flex-grow flex items-center justify-center p-4">
                    <div className="gnome-window w-full max-w-md">
                        <div className="gnome-header flex h-[44px] items-center justify-center">
                            <span className="text-sm font-bold text-gray-600">Авторизация администратора</span>
                        </div>
                        <div className="bg-white p-6">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Логин</label>
                                    <input
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ubuntu-orange outline-none text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Пароль</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ubuntu-orange outline-none text-sm"
                                        required
                                    />
                                </div>
                                {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded border border-red-100">{error}</div>}
                                <button
                                    type="submit"
                                    className="w-full bg-ubuntu-orange text-white py-2 rounded-md hover:bg-[#ff632d] transition-colors font-bold shadow-md"
                                >
                                    Войти
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="h-screen w-screen overflow-hidden flex flex-col bg-[#e8e8e7]">
            <TopBar />
            <div className="flex-grow flex flex-col items-center justify-start p-4 mt-16 gap-8 w-full max-w-4xl mx-auto overflow-y-auto">
                <GnomeWindow title="Настройка привязки к источнику" hideSidebar onClose={() => window.location.href = '/knowledgeJourney'}>
                    <div className="p-4 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                <FileText className="text-ubuntu-orange" />
                                Выбор темы и файла
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Тема обучения</label>
                                    <select
                                        value={selectedTopicId}
                                        onChange={(e) => setSelectedTopicId(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-ubuntu-orange outline-none text-sm"
                                    >
                                        <option value="none">Выберите тему...</option>
                                        {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Источник (PDF)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={pdfPath}
                                            onChange={(e) => setPdfPath(e.target.value)}
                                            placeholder="Путь до PDF или выберите файл"
                                            className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none"
                                        />
                                        <button
                                            onClick={handleBrowsePDF}
                                            className="w-[110px] px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center"
                                        >
                                            <Search size={16} />
                                            Обзор
                                        </button>
                                        <button
                                            onClick={handleApplyPDF}
                                            disabled={(!pdfPath && !(window as any)._adminSelectedPdfFile) || isProcessing || selectedTopicId === "none"}
                                            className="px-4 py-2 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md w-[130px] justify-center"
                                        >
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                            {isProcessing ? '...' : 'Индексировать'}
                                        </button>
                                        <button
                                            onClick={handleClearTheme}
                                            disabled={isClearing || selectedTopicId === "none"}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md w-[130px] justify-center"
                                        >
                                            {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
                                            {isClearing ? '...' : 'Очистить БЗ'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isProcessing && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-ubuntu-orange" />
                                    Процесс индексации
                                </h3>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
                                    {chunkSteps.map((step, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                            <div className={
                                                step.status === "done" ? "text-green-500" :
                                                step.status === "active" ? "text-ubuntu-orange animate-pulse" : "text-gray-300"
                                            }>
                                                {step.status === "done" ? <CheckCircle2 size={16} /> : step.icon}
                                            </div>
                                            <span className={
                                                step.status === "done" ? "text-green-700 font-medium" :
                                                step.status === "active" ? "text-gray-800 font-medium" : "text-gray-400"
                                            }>
                                                {step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 className="text-green-500" />
                                <span className="font-medium">{successMessage}</span>
                            </div>
                        )}

                        {sections.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-lg font-bold text-gray-700">Доступные разделы в источнике:</h3>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-60 overflow-y-auto">
                                    <ul className="space-y-2">
                                        {sections.map(s => (
                                            <li key={s.id} className="text-sm text-gray-600 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-ubuntu-orange rounded-full" />
                                                {s.title}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                    * Эти разделы будут доступны пользователю в выпадающем списке при выборе данной темы.
                                </p>
                            </div>
                        )}
                    </div>
                </GnomeWindow>
            </div>
        </main>
    );
};

export default AdminSourcesPage;
