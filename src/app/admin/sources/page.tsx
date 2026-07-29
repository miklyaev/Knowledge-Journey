"use client";

import React, { useState, useEffect } from "react";
import { TopBar, GnomeWindow } from "@/components/GnomeUI";
import { getPublicApiBaseUrl } from "@/lib/apiBase";
import { Loader2, FileText, Save, Search, CheckCircle2, Trash2, Database, Brain, FileSearch, Play, AlertTriangle } from "lucide-react";

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
    const [processPdf, setProcessPdf] = useState(false);
    const [pagesToRemove, setPagesToRemove] = useState("");
    const DEFAULT_SECTION_REGEX = "^\\d+(?:\\.\\d+)*\\.\\s+[А-ЯA-ZЁ]";
    const [sectionRegex, setSectionRegex] = useState(DEFAULT_SECTION_REGEX);
    const [cleanedSections, setCleanedSections] = useState<{ id: string, title: string }[]>([]);
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<{ sectionCount: number, sections: { id: string, title: string }[] } | null>(null);
    const [testSelectedSectionTitles, setTestSelectedSectionTitles] = useState<Set<string>>(new Set());
    const [testError, setTestError] = useState("");
    const [chromaWarning, setChromaWarning] = useState("");
    const [sectionMode, setSectionMode] = useState<'regex' | 'center'>('regex');
    const [skipFirstPages, setSkipFirstPages] = useState("0");
    const [pendingSections, setPendingSections] = useState<{ id: string, title: string, finalized?: boolean }[]>([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
    const [isFinalizingPdf, setIsFinalizingPdf] = useState(false);

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
            if (file.size > 50 * 1024 * 1024) {
                alert(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимальный размер — 50 МБ.`);
                return;
            }
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

    const handleTestRegex = async () => {
        if (!(window as any)._adminSelectedPdfFile) {
            alert("Сначала выберите PDF-файл");
            return;
        }

        setIsTesting(true);
        setTestResults(null);
        setTestError("");
        const baseUrl = getPublicApiBaseUrl();
        const formData = new FormData();
        formData.append('pdf', (window as any)._adminSelectedPdfFile);
        formData.append('sectionRegex', sectionRegex);
        formData.append('pagesToRemove', pagesToRemove);
        formData.append('skipFirstPages', skipFirstPages);

        try {
            const response = await fetch(`${baseUrl}/api/pdf/test-regex`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || data.error || 'Ошибка тестирования');
            }
            setTestResults(data);
            setTestSelectedSectionTitles(new Set(data.sections.map((section: { title: string }) => section.title)));
        } catch (error: any) {
            console.error('Error testing regex:', error);
            setTestError(error.message);
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestCenter = async () => {
        if (!(window as any)._adminSelectedPdfFile) {
            alert("Сначала выберите PDF-файл");
            return;
        }

        setIsTesting(true);
        setTestResults(null);
        setTestError("");
        const baseUrl = getPublicApiBaseUrl();
        const formData = new FormData();
        formData.append('pdf', (window as any)._adminSelectedPdfFile);
        formData.append('pagesToRemove', pagesToRemove);
        formData.append('skipFirstPages', skipFirstPages);

        try {
            const response = await fetch(`${baseUrl}/api/pdf/test-center`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || data.error || 'Ошибка тестирования');
            }
            setTestResults(data);
            setTestSelectedSectionTitles(new Set(data.sections.map((section: { title: string }) => section.title)));
        } catch (error: any) {
            console.error('Error testing center:', error);
            setTestError(error.message);
        } finally {
            setIsTesting(false);
        }
    };

    const handleApplyPDF = async (sectionTitlesToKeep?: Set<string>) => {
        if (selectedTopicId === "none") {
            alert("Выберите тему");
            return;
        }
        if (!pdfPath && !(window as any)._adminSelectedPdfFile) return;

        const file = (window as any)._adminSelectedPdfFile;
        if (file && file.size > 50 * 1024 * 1024) {
            alert(`Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимальный размер — 50 МБ.`);
            return;
        }
        if (file && file.size > 5 * 1024 * 1024) {
            const confirmed = confirm("Размер PDF-файла превышает 5 МБ. Индексация может занять длительное время (более 5 мин). Продолжить?");
            if (!confirmed) return;
        }

        setIsProcessing(true);
        setSuccessMessage("");
        setSections([]);
        setCleanedSections([]);
        setChromaWarning("");
        setPendingSections([]);
        setSelectedSectionIds(new Set());
        setChunkSteps(STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" as const : "pending" as const })));
        const baseUrl = getPublicApiBaseUrl();
        const formData = new FormData();

        if ((window as any)._adminSelectedPdfFile) {
            formData.append('pdf', (window as any)._adminSelectedPdfFile);
        } else {
            formData.append('path', pdfPath);
        }
        formData.append('themeId', selectedTopicId);

        if (processPdf) {
            formData.append('processPdf', 'true');
            formData.append('sectionMode', sectionMode);
            formData.append('pagesToRemove', pagesToRemove);
            formData.append('sectionRegex', sectionRegex);
            formData.append('skipFirstPages', skipFirstPages);
        }

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

            // Если разделы были выбраны после теста, финализируем их без промежуточного шага.
            if (processPdf && data.finalized === false && sectionTitlesToKeep) {
                const selectedIds = (data.sections || [])
                    .filter((section: { id: string, title: string }) => sectionTitlesToKeep.has(section.title))
                    .map((section: { id: string }) => section.id);

                if (selectedIds.length === 0) {
                    throw new Error('Не удалось сопоставить выбранные при тестировании разделы с обработанным PDF');
                }

                await finalizePdf(data.pdfId, selectedIds);
            } else if (processPdf && data.finalized === false) {
                setPendingSections(data.sections || []);
                // По умолчанию выбираем все разделы
                const allIds = new Set<string>((data.sections || []).map((s: any) => s.id));
                setSelectedSectionIds(allIds);
                setSuccessMessage("Разделы загружены. Выберите, какие сохранить, и нажмите 'Сохранить'");
            } else {
                if (data.cleanedSections) {
                    setCleanedSections(data.cleanedSections);
                }
                setSuccessMessage("PDF успешно привязан к теме!");
                if (data.vectorization?.error) {
                    setChromaWarning(data.vectorization.error);
                }
            }
            animateSteps();
        } catch (error: any) {
            console.error('Error applying PDF:', error);
            setChunkSteps(STEPS.map(s => ({ ...s, status: "pending" as const })));
            alert(`Ошибка: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const finalizePdf = async (pdfIdToFinalize: string, sectionIds: string[]) => {
        setIsFinalizingPdf(true);
        const baseUrl = getPublicApiBaseUrl();
        try {
            const response = await fetch(`${baseUrl}/api/pdf/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfId: pdfIdToFinalize,
                    themeId: selectedTopicId,
                    sectionsToKeep: sectionIds
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to finalize PDF');
            }
            setPendingSections([]);
            setSelectedSectionIds(new Set());
            setSuccessMessage(`PDF успешно сохранён с ${data.sectionsCount} разделами!`);
            if (data.vectorization?.error) {
                setChromaWarning(data.vectorization.error);
            }
        } finally {
            setIsFinalizingPdf(false);
        }
    };

    const handleFinalizePdf = async () => {
        if (!pdfId || selectedSectionIds.size === 0) {
            alert("Выберите хотя бы один раздел");
            return;
        }

        try {
            await finalizePdf(pdfId, Array.from(selectedSectionIds));
        } catch (error: any) {
            console.error('Error finalizing PDF:', error);
            alert(`Ошибка: ${error.message}`);
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
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ИСТОЧНИК (PDF не более 50 Мб)</label>
                                    <div className="flex gap-2 w-full">
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
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Обработка PDF */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={processPdf}
                                    onChange={(e) => setProcessPdf(e.target.checked)}
                                    className="w-4 h-4 text-ubuntu-orange focus:ring-ubuntu-orange border-gray-300 rounded"
                                />
                                <span className="text-sm font-bold text-gray-700">Обработка PDF</span>
                            </label>

                            {processPdf && (
                                <div className="ml-6 space-y-3 border-l-2 border-ubuntu-orange pl-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                            Страницы для удаления
                                        </label>
                                        <input
                                            type="text"
                                            value={pagesToRemove}
                                            onChange={(e) => setPagesToRemove(e.target.value)}
                                            placeholder="1,3,5-8"
                                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Формат: 1,3,5-8</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                            Пропустить первые N страниц
                                        </label>
                                        <input
                                            type="number"
                                            value={skipFirstPages}
                                            onChange={(e) => setSkipFirstPages(e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Автоматически удалит титульные листы</p>
                                    </div>

                                    {/* Режим извлечения разделов */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                            Режим извлечения разделов
                                        </label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="sectionMode"
                                                    checked={sectionMode === 'regex'}
                                                    onChange={() => { setSectionMode('regex'); setTestResults(null); setTestSelectedSectionTitles(new Set()); setTestError(""); }}
                                                    className="w-4 h-4 text-ubuntu-orange focus:ring-ubuntu-orange border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700">Регулярное выражение для разделов</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="sectionMode"
                                                    checked={sectionMode === 'center'}
                                                    onChange={() => { setSectionMode('center'); setTestResults(null); setTestSelectedSectionTitles(new Set()); setTestError(""); }}
                                                    className="w-4 h-4 text-ubuntu-orange focus:ring-ubuntu-orange border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700">Если разделы по центру без нумерации</span>
                                            </label>
                                        </div>
                                    </div>

                                    {sectionMode === 'regex' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                Регулярное выражение для разделов
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={sectionRegex}
                                                    onChange={(e) => { setSectionRegex(e.target.value); setTestResults(null); setTestSelectedSectionTitles(new Set()); setTestError(""); }}
                                                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubuntu-orange outline-none font-mono"
                                                />
                                                <button
                                                    onClick={() => { setSectionRegex(DEFAULT_SECTION_REGEX); setTestResults(null); setTestSelectedSectionTitles(new Set()); setTestError(""); }}
                                                    disabled={sectionRegex === DEFAULT_SECTION_REGEX}
                                                    title="Сбросить к выражению по умолчанию"
                                                    className="px-2 py-2 border border-gray-300 hover:bg-gray-100 text-gray-500 rounded-lg text-sm transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed w-[38px]"
                                                >
                                                    ↩
                                                </button>
                                                <button
                                                    onClick={handleTestRegex}
                                                    disabled={!sectionRegex || !(window as any)._adminSelectedPdfFile || isTesting}
                                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-sm w-[90px] justify-center"
                                                >
                                                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
                                                    {isTesting ? '...' : 'Тест'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Поиск названий разделов в очищенном PDF</p>
                                        </div>
                                    )}

                                    {sectionMode === 'center' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                Алгоритм центровки заголовков
                                            </label>
                                            <p className="text-xs text-gray-500 mb-2">
                                                Заголовки определяются автоматически по расположению текста по центру страницы
                                                и характерной длине (1–8 слов, начинаются с заглавной буквы).
                                            </p>
                                            <button
                                                onClick={handleTestCenter}
                                                disabled={!(window as any)._adminSelectedPdfFile || isTesting}
                                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-sm w-[90px] justify-center"
                                            >
                                                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
                                                {isTesting ? '...' : 'Тест'}
                                            </button>
                                        </div>
                                    )}

                                    {testError && (
                                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                                            <AlertTriangle size={16} />
                                            {testError}
                                        </div>
                                    )}

                                    {testResults && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-2">
                                                {testResults.sectionCount > 0 ? (
                                                    <CheckCircle2 size={18} className="text-green-500" />
                                                ) : (
                                                    <AlertTriangle size={18} className="text-yellow-500" />
                                                )}
                                                <span className="text-sm font-bold text-gray-700">
                                                    Найдено разделов: {testResults.sectionCount}
                                                </span>
                                            </div>
                                            {testResults.sectionCount > 0 && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-gray-500">Снимите отметки с разделов, которые не должны попасть в RAG.</p>
                                                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 max-h-48 overflow-y-auto">
                                                        <ul className="space-y-1.5">
                                                            {testResults.sections.map(s => (
                                                                <li key={s.id}>
                                                                    <label className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-blue-50">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={testSelectedSectionTitles.has(s.title)}
                                                                            onChange={(e) => {
                                                                                const selectedTitles = new Set(testSelectedSectionTitles);
                                                                                if (e.target.checked) {
                                                                                    selectedTitles.add(s.title);
                                                                                } else {
                                                                                    selectedTitles.delete(s.title);
                                                                                }
                                                                                setTestSelectedSectionTitles(selectedTitles);
                                                                            }}
                                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-sm text-gray-600">{s.title}</span>
                                                                    </label>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <button
                                                        onClick={() => handleApplyPDF(testSelectedSectionTitles)}
                                                        disabled={isProcessing || isFinalizingPdf || testSelectedSectionTitles.size === 0 || selectedTopicId === "none"}
                                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md"
                                                    >
                                                        {(isProcessing || isFinalizingPdf) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                                        {(isProcessing || isFinalizingPdf) ? 'Сохранение...' : 'Сохранить выбранные'}
                                                    </button>
                                                </div>
                                            )}
                                            {testResults.sectionCount === 0 && (
                                                <p className="text-xs text-yellow-600 italic">
                                                    {sectionMode === 'regex'
                                                        ? 'Регулярное выражение не нашло совпадений. Попробуйте изменить выражение.'
                                                        : 'Алгоритм центровки не обнаружил заголовков. Попробуйте выбрать режим регулярного выражения.'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
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

                        {chromaWarning && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="text-yellow-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-medium block">ChromDB недоступна</span>
                                    <span className="text-sm">{chromaWarning}</span>
                                </div>
                            </div>
                        )}

                        {cleanedSections.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-lg font-bold text-gray-700">Доступные разделы в источнике (очистка):</h3>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-60 overflow-y-auto">
                                    <ul className="space-y-2">
                                        {cleanedSections.map(s => (
                                            <li key={s.id} className="text-sm text-gray-600 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-ubuntu-orange rounded-full" />
                                                {s.title}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                    * Разделы, извлечённые после очистки PDF (удаления страниц).
                                </p>
                            </div>
                        )}

                        {pendingSections.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 border-2 border-blue-300 bg-blue-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-blue-900">Выбор разделов для сохранения</h3>
                                <p className="text-sm text-blue-800">Отметьте разделы, которые вы хотите сохранить. Остальные будут удалены.</p>
                                <div className="bg-white rounded-lg border border-blue-200 p-4 max-h-80 overflow-y-auto space-y-2">
                                    {pendingSections.map(s => (
                                        <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-blue-100 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedSectionIds.has(s.id)}
                                                onChange={(e) => {
                                                    const newIds = new Set(selectedSectionIds);
                                                    if (e.target.checked) {
                                                        newIds.add(s.id);
                                                    } else {
                                                        newIds.delete(s.id);
                                                    }
                                                    setSelectedSectionIds(newIds);
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-700 flex-1">{s.title}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedSectionIds(new Set(pendingSections.map(s => s.id)))}
                                        className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all"
                                    >
                                        Выбрать все
                                    </button>
                                    <button
                                        onClick={() => setSelectedSectionIds(new Set())}
                                        className="px-3 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded font-bold transition-all"
                                    >
                                        Отменить все
                                    </button>
                                </div>
                            </div>
                        )}

                        {sections.length > 0 && pendingSections.length === 0 && (
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
                        <div className="flex gap-2 justify-center flex-wrap">
                            {pendingSections.length > 0 && (
                                <button
                                    onClick={handleFinalizePdf}
                                    disabled={isFinalizingPdf || selectedSectionIds.size === 0}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md whitespace-nowrap"
                                >
                                    {isFinalizingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                    {isFinalizingPdf ? '...' : 'Сохранить'}
                                </button>
                            )}
                            {!processPdf && (
                                <button
                                    onClick={() => handleApplyPDF()}
                                    disabled={(!pdfPath && !(window as any)._adminSelectedPdfFile) || isProcessing || selectedTopicId === "none"}
                                    className="px-4 py-2 bg-ubuntu-orange hover:bg-[#ff632d] text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md whitespace-nowrap"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                    {isProcessing ? '...' : 'Индексировать'}
                                </button>
                            )}
                            <button
                                onClick={handleClearTheme}
                                disabled={isClearing || selectedTopicId === "none"}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:bg-gray-300 transition-all flex items-center gap-2 shadow-md whitespace-nowrap"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
                                {isClearing ? '...' : 'Очистить базу знаний'}
                            </button>
                        </div>
                    </div>
                </GnomeWindow>
            </div>
        </main>
    );
};

export default AdminSourcesPage;
