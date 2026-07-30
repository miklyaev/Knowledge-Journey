'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

interface Theme {
  id: string;
  title: string;
  prompt: string;
}

interface ThemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminLogin: string;
  adminPassword: string;
  onThemesUpdated?: () => void;
}

const ThemesModal: React.FC<ThemesModalProps> = ({
  isOpen,
  onClose,
  adminLogin,
  adminPassword,
  onThemesUpdated
}) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Форма для добавления/редактирования
  const [formData, setFormData] = useState({ id: '', title: '', prompt: '' });

  useEffect(() => {
    if (isOpen) {
      fetchThemes();
    }
  }, [isOpen]);

  const fetchThemes = async () => {
    setIsLoading(true);
    setError('');
    const baseUrl = getPublicApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/themes`);
      if (!response.ok) throw new Error('Ошибка загрузки тем');
      const data = await response.json();
      setThemes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ id: '', title: '', prompt: '' });
    setError('');
  };

  const handleEditClick = (theme: Theme) => {
    setEditingId(theme.id);
    setIsAdding(false);
    setFormData({ id: theme.id, title: theme.title, prompt: theme.prompt });
    setError('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ id: '', title: '', prompt: '' });
    setError('');
  };

  const handleSave = async () => {
    if (!formData.id || !formData.title || !formData.prompt) {
      setError('Все поля обязательны');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    const baseUrl = getPublicApiBaseUrl();

    try {
      const url = editingId
        ? `${baseUrl}/api/themes/${editingId}`
        : `${baseUrl}/api/themes/add`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: adminLogin,
          password: adminPassword,
          id: formData.id,
          title: formData.title,
          prompt: formData.prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сохранении');
      }

      setSuccessMessage(data.message || 'Тема сохранена успешно');
      setIsAdding(false);
      setEditingId(null);
      setFormData({ id: '', title: '', prompt: '' });
      await fetchThemes();
      onThemesUpdated?.();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (themeId: string) => {
    const themeName = themes.find(t => t.id === themeId)?.title || themeId;
    if (!confirm(`Удалить тему "${themeName}"?`)) return;

    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    const baseUrl = getPublicApiBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/api/themes/${themeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: adminLogin,
          password: adminPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении');
      }

      setSuccessMessage(data.message || 'Тема удалена успешно');
      await fetchThemes();
      onThemesUpdated?.();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-1.2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Управление темами</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Ошибка</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h3 className="font-bold text-gray-800">
                {editingId ? 'Редактирование темы' : 'Добавление новой темы'}
              </h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  ID темы {editingId && '(не изменяется)'}
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!editingId}
                  placeholder="например: csharp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Название темы
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="например: Изучение языка C#"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Системный промпт
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Опишите роль ИИ для этой темы..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          )}

          {/* Themes List */}
          {!isAdding && !editingId && (
            <div className="space-y-4">
              <button
                onClick={handleAddClick}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Добавить новую тему
              </button>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : themes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Темы не найдены</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800">{theme.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">ID: {theme.id}</p>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {theme.prompt}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button
                          onClick={() => handleEditClick(theme)}
                          disabled={isLoading}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(theme.id)}
                          disabled={isLoading}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg font-bold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemesModal;
