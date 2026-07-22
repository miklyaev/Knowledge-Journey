import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Парсит PDF файл и возвращает текст.
 * Согласно документации:  https://mehmet-kozan.github.io/pdf-parse/
 */
export async function parsePDF(filePath) {
	const dataBuffer = fs.readFileSync(filePath);

	try {
		// Стандартный вызов pdf-parse для версии 2.x
		const pdfParser = typeof pdf === 'function' ? pdf : pdf.default;
		const data = await pdfParser(dataBuffer);
		const text = data?.text || '';
		
		if (!text.trim()) {
			console.warn(`⚠️ PDF файл ${filePath} вернул пустой текст.`);
		}
		
		return text;
	} catch (err) {
		console.error('Ошибка парсинга PDF:', err);
		// Попробуем альтернативный метод, если основной упал
		try {
			const PDFParse = pdf?.PDFParse;
			if (typeof PDFParse === 'function') {
				const uint8Data = Uint8Array.from(dataBuffer);
				const parser = new PDFParse({ data: uint8Data });
				const data = await parser.getText();
				return data?.text || '';
			}
		} catch (innerErr) {
			console.error('Вторичная ошибка парсинга PDF:', innerErr);
		}
		throw new Error(`Ошибка при обработке PDF: ${err.message}`);
	}
}



/**
 * Извлекает разделы из текста на основе заголовков.
 * @param {string} text - текст для анализа
 * @param {string|null} [customRegex=null] - кастомное регулярное выражение (если задано, используется вместо встроенного)
 * @param {string[]|null} [sectionTitles=null] - готовый массив названий разделов (из cleanPdf);
 *   если передан, текст режется по этим заголовкам без повторного regex-сканирования
 */
export function extractSections(text, customRegex = null, sectionTitles = null) {
	if (!text) return [];
	const lines = text.split('\n');
	const sections = [];
	let currentSection = { title: 'Введение', content: '' };

	const usePredefinedTitles = sectionTitles && Array.isArray(sectionTitles) && sectionTitles.length > 0;

	if (usePredefinedTitles) {
		// Используем уже извлечённые заголовки — режем текст по ним
		const titleSet = new Set(sectionTitles.map(t => t.replace(/\s+/g, ' ').trim()));

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.length > 0) {
				const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
				if (titleSet.has(normalizedLine)) {
					if (currentSection.content.trim()) {
						sections.push(currentSection);
					}
					currentSection = { title: normalizedLine, content: '' };
					continue;
				}
			}
			if (trimmedLine.length > 0) {
				currentSection.content += line + '\n';
			}
		}
	} else {
		// Извлекаем разделы через regex
		const sectionRegex = customRegex
			? new RegExp(customRegex, 'iu')
			: /^(Глава|Раздел|Часть|Статья|Параграф|Пункт|\d+\.\d*|\d+)\s+.+/i;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine.length > 0 && sectionRegex.test(trimmedLine)) {
				if (currentSection.content.trim()) {
					sections.push(currentSection);
				}
				currentSection = { title: trimmedLine, content: '' };
			} else if (trimmedLine.length > 0) {
				currentSection.content += line + '\n';
			}
		}
	}

	// Если после парсинга у нас есть контент, но нет секций (не сработал regex),
	// или остался последний кусок - добавляем его.
	if (currentSection.content.trim()) {
		sections.push(currentSection);
	}

	// Если вообще ничего не нашли, но текст был - создаем одну секцию "Весь документ"
	if (sections.length === 0 && text.trim()) {
		sections.push({ title: 'Основной текст', content: text });
	}

	return sections;
}