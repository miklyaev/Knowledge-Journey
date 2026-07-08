import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

/**
 * Извлекает разделы из текста на основе заголовков.
 * @param {string} text Весь текст PDF
 * @returns {Array<{title: string, content: string}>} Список разделов
 */
export function extractSections(text) {
    // Регулярное выражение для поиска заголовков (например, "Глава 1", "Раздел 1", "1.1 ...")
    // В данном случае будем искать строки, которые выглядят как заголовки (начинаются с цифр или слов Глава/Раздел)
    const lines = text.split('\n');
    const sections = [];
    let currentSection = { title: 'Введение', content: '' };

    const sectionRegex = /^(Глава|Раздел|\d+\.\d*|\d+)\s+.+/i;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (sectionRegex.test(trimmedLine)) {
            if (currentSection.content.trim()) {
                sections.push(currentSection);
            }
            currentSection = { title: trimmedLine, content: '' };
        } else {
            currentSection.content += line + '\n';
        }
    }

    if (currentSection.content.trim()) {
        sections.push(currentSection);
    }

    return sections;
}

// module.exports = {
//     parsePDF,
//     extractSections
// };
