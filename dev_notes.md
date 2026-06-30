# Dev Notes

Краткий журнал ключевых изменений проекта.

## Журнал изменений

### 2026-07-01 — Динамическая загрузка тем обучения

**Область:** Frontend, Backend

**Что изменилось:**
- Создан конфигурационный файл `themeCollection.json` на бэкенде для хранения тем обучения.
- Добавлен эндпоинт `GET /api/themes` в `server.js` для отдачи списка тем.
- Создан новый React-компонент `ThemeSelector` для загрузки и выбора тем.
- Страница `knowledgeJourney` переведена со статического массива `TOPICS` на использование `ThemeSelector`.

**Затронутые пути:**
- `backend/themeCollection.json`
- `backend/server.js`
- `src/components/ThemeSelector.tsx`
- `src/app/knowledgeJourney/page.tsx`

**Зачем / контекст:** 
Позволяет добавлять и редактировать темы обучения без необходимости пересборки фронтенд-приложения.
