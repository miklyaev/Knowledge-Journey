import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { extractChunks } = require('./extractChunks.cjs');

/**
 * Извлекает разделы из PDF, используя алгоритм центровки заголовков.
 * Анализирует позицию текста на странице: если строка расположена по центру
 * и соответствует паттерну заголовка — она считается названием раздела.
 *
 * @param {string} pdfPath - путь к PDF файлу
 * @returns {Promise<{title: string, content: string}[]>}
 */
export async function extractCenterSections(pdfPath) {
  const chunks = await extractChunks(pdfPath);
  return chunks.map(chunk => ({
    title: chunk.title || 'Введение',
    content: chunk.text || '',
  }));
}