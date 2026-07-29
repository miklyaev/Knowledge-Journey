import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

const defaultSectionRegex = [
	'^('
	, 'глава\\s+\\d+'
	, '|раздел\\s+\\d+'
	, '|часть\\s+\\d+'
	, '|§\\s*\\d+'
	, '|\\d+\\.\\s+[А-ЯA-ZЁ]'
	, '|\\d+\\.\\d+\\s+[А-ЯA-ZЁ]'
	, ')'
].join('');

export { defaultSectionRegex };

function parsePages(pagesArg) {
	const pagesToRemove = new Set();

	if (!pagesArg || !pagesArg.trim()) {
		return pagesToRemove;
	}

	const parts = pagesArg.split(',');

	for (const rawPart of parts) {
		const part = rawPart.trim();

		if (!part) {
			continue;
		}

		if (part.includes('-')) {
			const [startStr, endStr] = part.split('-', 2);
			const start = Number.parseInt(startStr, 10);
			const end = Number.parseInt(endStr, 10);

			if (!Number.isInteger(start) || !Number.isInteger(end)) {
				throw new Error(`Некорректный диапазон страниц: ${part}`);
			}

			if (start > end) {
				throw new Error(`Некорректный диапазон страниц: ${part}`);
			}

			for (let page = start; page <= end; page++) {
				pagesToRemove.add(page);
			}
		} else {
			const page = Number.parseInt(part, 10);

			if (!Number.isInteger(page)) {
				throw new Error(`Некорректный номер страницы: ${part}`);
			}

			pagesToRemove.add(page);
		}
	}

	return pagesToRemove;
}

export { parsePages };

async function removePagesFromPdf(inputPdfPath, outputPdfPath, pagesToRemove) {
	const inputPdfBytes = await fs.readFile(inputPdfPath);
	const pdfDoc = await PDFDocument.load(inputPdfBytes);

	const totalPages = pdfDoc.getPageCount();

	const invalidPages = [...pagesToRemove].filter(
		page => page < 1 || page > totalPages
	);

	if (invalidPages.length > 0) {
		throw new Error(
			`Указаны несуществующие страницы: ${invalidPages.join(', ')}. ` +
			`Всего страниц в PDF: ${totalPages}`
		);
	}

	const pageIndexesToRemove = [...pagesToRemove]
		.map(page => page - 1)
		.sort((a, b) => b - a);

	for (const pageIndex of pageIndexesToRemove) {
		pdfDoc.removePage(pageIndex);
	}

	const outputPdfBytes = await pdfDoc.save();

	const directory = path.dirname(path.resolve(outputPdfPath));
	await fs.mkdir(directory, { recursive: true });
	await fs.writeFile(outputPdfPath, outputPdfBytes);

	return {
		totalPagesBefore: totalPages,
		totalPagesAfter: pdfDoc.getPageCount(),
		removedPages: [...pagesToRemove].sort((a, b) => a - b),
	};
}

export { removePagesFromPdf };

async function extractTextFromPdf(pdfPath) {
	const pdfBuffer = await fs.readFile(pdfPath);

	if (typeof pdfParseModule === 'function') {
		const data = await pdfParseModule(pdfBuffer);
		return data.text || '';
	}

	if (typeof pdfParseModule.default === 'function') {
		const data = await pdfParseModule.default(pdfBuffer);
		return data.text || '';
	}

	const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

	if (PDFParse) {
		const parser = new PDFParse({ data: pdfBuffer });

		try {
			const result = await parser.getText();

			if (typeof result === 'string') {
				return result;
			}

			return result.text || '';
		} finally {
			if (typeof parser.destroy === 'function') {
				await parser.destroy();
			}
		}
	}

	throw new Error(
		'Не удалось определить API библиотеки pdf-parse. ' +
		'Попробуйте установить совместимую версию: npm install pdf-parse@1.1.1'
	);
}

export { extractTextFromPdf };

function normalizeLine(line) {
	return line
		.replace(/\s+/g, ' ')
		.trim();
}

function extractSectionTitles(text, sectionRegex) {
	const titles = [];
	const headingPattern = new RegExp(sectionRegex, 'iu');
	const lines = text.split(/\r?\n/);

	for (const line of lines) {
		const title = normalizeLine(line);

		if (!title) {
			continue;
		}

		if (headingPattern.test(title)) {
			titles.push(title);
		}
	}

	return titles;
}

export { extractSectionTitles };

/**
 * Автоматически определяет начальные страницы PDF без номеров страниц
 * и возвращает их номера для удаления.
 *
 * Анализирует страницы с начала документа. Если на странице нет ни одного
 * изолированного числа (1-4 цифры) И страница почти пуста (< 5 элементов),
 * она считается ненумерованной. Останавливается на первой странице,
 * где найден номер или структурированный контент, или после 20 страниц.
 *
 * @param {string} pdfPath - путь к PDF файлу
 * @returns {Promise<number[]>} - массив номеров страниц для удаления
 */
async function detectUnnumberedLeadingPages(pdfPath) {
	try {
		const pdfjsLib = await import('pdfjs-dist');
		const dataBuffer = await fs.readFile(pdfPath);
		const data = new Uint8Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);
		const pdf = await pdfjsLib.getDocument({ data }).promise;

		const unnumberedPages = [];
		const MAX_AUTO_REMOVE = 20;

		for (let pageNum = 1; pageNum <= pdf.numPages && pageNum <= MAX_AUTO_REMOVE; pageNum++) {
			const page = await pdf.getPage(pageNum);
			const content = await page.getTextContent();

			// Проверяем наличие номера страницы
			const hasPageNumber = content.items.some(item => {
				const str = item.str.trim();
				return /^\d{1,4}$/.test(str);
			});

			// Проверяем, пуста ли страница (< 5 элементов)
			const isEmpty = content.items.length < 5;

			// Если есть номер или страница не пуста и содержит структурированный контент, останавливаемся
			if (hasPageNumber || (!isEmpty && content.items.length > 0)) {
				break;
			}

			// Если страница пуста или почти пуста, добавляем в список для удаления
			if (isEmpty || content.items.length === 0) {
				unnumberedPages.push(pageNum);
			}
		}

		return unnumberedPages;
	} catch (error) {
		console.error('Error detecting unnumbered leading pages:', error.message);
		return [];
	}
}

/**
 * Основная функция очистки PDF:
 * 1. Автоматически удаляет начальные страницы без номеров
 * 2. Удаляет первые N страниц (если skipFirstPages > 0)
 * 3. Удаляет страницы, указанные пользователем
 * 4. Извлекает текст из очищенного PDF
 * 5. Находит заголовки разделов по регулярному выражению
 *
 * @param {string} inputPdfPath - путь к исходному PDF
 * @param {string} outputPdfPath - путь для сохранения очищенного PDF
 * @param {string} pagesToRemoveArg - страницы для удаления (формат: '1,3,5-8')
 * @param {string} sectionRegex - регулярное выражение для разделов
 * @param {number} skipFirstPages - количество первых страниц для удаления (0 = не удалять)
 * @returns {{ pdfInfo: object, sections: string[], text: string }}
 * @throws {Error} если skipFirstPages больше количества страниц в PDF
 */
export async function cleanPdf(inputPdfPath, outputPdfPath, pagesToRemoveArg, sectionRegex, skipFirstPages = 0) {
	const resolvedRegex = sectionRegex || defaultSectionRegex;
	const pagesToRemove = parsePages(pagesToRemoveArg);

	// Получаем общее количество страниц
	const inputPdfBytes = await fs.readFile(inputPdfPath);
	const pdfDoc = await PDFDocument.load(inputPdfBytes);
	const totalPages = pdfDoc.getPageCount();

	// Проверяем skipFirstPages
	if (skipFirstPages > 0) {
		if (skipFirstPages > totalPages) {
			throw new Error(
				`skipFirstPages (${skipFirstPages}) больше количества страниц в PDF (${totalPages})`
			);
		}
		// Добавляем первые N страниц в список для удаления
		for (let i = 1; i <= skipFirstPages; i++) {
			pagesToRemove.add(i);
		}
		console.log(`Skipping first ${skipFirstPages} pages`);
	}

	// Авто-детекция начальных страниц без номеров
	const unnumberedPages = await detectUnnumberedLeadingPages(inputPdfPath);
	for (const page of unnumberedPages) {
		pagesToRemove.add(page);
	}

	if (unnumberedPages.length > 0) {
		console.log(`Auto-detected unnumbered leading pages and added to removal: ${unnumberedPages.join(', ')}`);
	}

	const pdfInfo = await removePagesFromPdf(inputPdfPath, outputPdfPath, pagesToRemove);
	const text = await extractTextFromPdf(outputPdfPath);
	const titles = extractSectionTitles(text, resolvedRegex);

	return {
		pdfInfo,
		sections: titles,
		text,
	};
}
