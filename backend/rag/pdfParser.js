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
		const PDFParse = pdf?.PDFParse;
		if (typeof PDFParse === 'function') {
			// pdf-parse@2.x в Node ожидает Uint8Array, а не Buffer
			const uint8Data = Uint8Array.from(dataBuffer);
			const parser = new PDFParse({ data: uint8Data });
			try {
				const data = await parser.getText();
				return data?.text || '';
			} finally {
				if (typeof parser.destroy === 'function') {
					await parser.destroy().catch(() => { });
				}
			}
		}

		// Fallback для старых версий pdf-parse (функциональный API)
		const parseFunc = typeof pdf === 'function' ? pdf : pdf?.default;
		if (typeof parseFunc !== 'function') {
			throw new Error('Библиотека pdf-parse не поддерживает ожидаемый API');
		}

		const data = await parseFunc(dataBuffer);
		return data?.text || '';
	} catch (err) {
		console.error('Ошибка парсинга PDF:', err);
		throw new Error(`Ошибка при обработке PDF: ${err.message}`);
	}
}



/**
 * Извлекает разделы из текста на основе заголовков.
 */
export function extractSections(text) {
	if (!text) return [];
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