# План по RAG: Интеграция локальных PDF для Knowledge Journey

## Статус: Выполнено ✅

## Архитектура
- **Векторное хранилище**: ChromaDB (Docker)
- **Embeddings**: GigaChat API
- **Парсинг**: pdf-parse + кастомный экстрактор разделов
- **База данных**: MySQL (метаданные PDF и разделов)

## Реализованные шаги

### 1. Backend-инфраструктура
- [x] Создана директория `backend/knowledge_base/`
- [x] Установлены зависимости: `pdf-parse`, `chromadb`, `uuid`, `multer`
- [x] ChromaDB добавлен в `docker-compose.yml`

### 2. Модуль RAG (`backend/rag/`)
- [x] `pdfParser.js`: Парсинг текста и извлечение разделов
- [x] `chunker.js`: Разбивка на чанки с метаданными
- [x] `embeddings.js`: Получение векторов через GigaChat
- [x] `vectorStore.js`: Интеграция с ChromaDB (add/search)

### 3. API Эндпоинты (`backend/server.js`)
- [x] `POST /api/pdf/upload`: Загрузка и индексация
- [x] `GET /api/pdf/sections/:pdfId`: Список разделов
- [x] `POST /api/rag/retrieve`: Поиск контекста
- [x] Модификация `/api/gigachat/generate` и `/api/yandexgpt/generate` для использования RAG

### 4. База данных
- [x] Создана таблица `t_pdfs` (`backend/t_pdfs.sql`)
- [x] Добавлены методы в `dbservice.js` для работы с метаданными

### 5. Frontend UI
- [x] Добавлены состояния RAG в `page.tsx`
- [x] Реализован интерфейс загрузки и выбора разделов
- [x] Интеграция параметров RAG в компонент `AIAssistant`
- [x] Отображение источника в ответах чата

## Инструкции по использованию
1. Запустить проект через `docker-compose up --build`.
2. В интерфейсе выбрать тему (например, C#).
3. Включить чекбокс "Привязка к источнику".
4. Загрузить PDF файл.
5. Выбрать раздел (опционально) и задать вопрос.
