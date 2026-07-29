const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const pdfParseModule = require("pdf-parse");

function parseCommandLineArgs(argv) {
	const args = {
		inputPdf: null,
		pages: "",
		outputPdf: null,
		outputJson: null,
		sectionRegex: null,
	};

	const positional = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "-p" || arg === "--pages") {
			args.pages = argv[++i] || "";
		} else if (arg === "-o" || arg === "--output-pdf") {
			args.outputPdf = argv[++i];
		} else if (arg === "-j" || arg === "--output-json") {
			args.outputJson = argv[++i];
		} else if (arg === "--section-regex") {
			args.sectionRegex = argv[++i];
		} else if (arg === "-h" || arg === "--help") {
			printHelp();
			process.exit(0);
		} else {
			positional.push(arg);
		}
	}

	args.inputPdf = positional[0];

	if (!args.inputPdf) {
		throw new Error("Не указан входной PDF-файл.");
	}

	if (!args.outputPdf) {
		throw new Error("Не указан выходной PDF-файл. Используйте -o или --output-pdf.");
	}

	if (!args.outputJson) {
		throw new Error("Не указан выходной JSON-файл. Используйте -j или --output-json.");
	}

	return args;
}

function printHelp() {
	console.log(`
Использование:

  node process_pdf.js <input.pdf> -p "1,3,5-8" -o <output.pdf> -j <sections.json>

Параметры:

  <input.pdf>              Путь к исходному PDF-файлу

  -p, --pages              Страницы для удаления.
                           Например: "1,3,5-8,10"
                           Если не указано, страницы не удаляются.

  -o, --output-pdf         Путь к выходному обработанному PDF-файлу

  -j, --output-json        Путь к выходному JSON-файлу с названиями разделов

  --section-regex          Регулярное выражение для поиска названий разделов

Примеры:

  node process_pdf.js "book.pdf" -p "1-4" -o "book_clean.pdf" -j "book_sections.json"

  node process_pdf.js "book.pdf" -p "1-4" -o "book_clean.pdf" -j "book_sections.json" --section-regex "^Глава\\\\s+\\\\d+"
`);
}

function parsePages(pagesArg) {
	const pagesToRemove = new Set();

	if (!pagesArg || !pagesArg.trim()) {
		return pagesToRemove;
	}

	const parts = pagesArg.split(",");

	for (const rawPart of parts) {
		const part = rawPart.trim();

		if (!part) {
			continue;
		}

		if (part.includes("-")) {
			const [startStr, endStr] = part.split("-", 2);

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

async function ensureParentDirectoryExists(filePath) {
	const directory = path.dirname(path.resolve(filePath));
	await fs.mkdir(directory, { recursive: true });
}

async function removePagesFromPdf(inputPdfPath, outputPdfPath, pagesToRemove) {
	const inputPdfBytes = await fs.readFile(inputPdfPath);

	const pdfDoc = await PDFDocument.load(inputPdfBytes, { ignoreEncryption: true });

	const totalPages = pdfDoc.getPageCount();

	const invalidPages = [...pagesToRemove].filter(
		page => page < 1 || page > totalPages
	);

	if (invalidPages.length > 0) {
		throw new Error(
			`Указаны несуществующие страницы: ${invalidPages.join(", ")}. ` +
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

	await ensureParentDirectoryExists(outputPdfPath);
	await fs.writeFile(outputPdfPath, outputPdfBytes);

	return {
		totalPagesBefore: totalPages,
		totalPagesAfter: pdfDoc.getPageCount(),
	};
}

async function extractTextFromPdf(pdfPath) {
	const pdfBuffer = await fs.readFile(pdfPath);

	/*
	  Старый API pdf-parse:
	  const pdfParse = require("pdf-parse");
	  await pdfParse(buffer)
	*/
	if (typeof pdfParseModule === "function") {
		const data = await pdfParseModule(pdfBuffer);
		return data.text || "";
	}

	/*
	  Иногда функция лежит в default.
	*/
	if (typeof pdfParseModule.default === "function") {
		const data = await pdfParseModule.default(pdfBuffer);
		return data.text || "";
	}

	/*
	  Новый API pdf-parse:
	  const { PDFParse } = require("pdf-parse");
	  const parser = new PDFParse({ data: buffer });
	  const result = await parser.getText();
	*/
	const PDFParse =
		pdfParseModule.PDFParse ||
		pdfParseModule.default?.PDFParse;

	if (PDFParse) {
		const parser = new PDFParse({
			data: pdfBuffer,
		});

		try {
			const result = await parser.getText();

			if (typeof result === "string") {
				return result;
			}

			return result.text || "";
		} finally {
			if (typeof parser.destroy === "function") {
				await parser.destroy();
			}
		}
	}

	throw new Error(
		"Не удалось определить API библиотеки pdf-parse. " +
		"Попробуйте установить совместимую версию: npm install pdf-parse@1.1.1"
	);
}

function normalizeLine(line) {
	return line
		.replace(/\s+/g, " ")
		.trim();
}

function extractSectionTitles(text, sectionRegex) {
	const titles = [];

	const headingPattern = new RegExp(sectionRegex, "iu");

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

async function saveTitlesToJson(titles, outputJsonPath) {
	await ensureParentDirectoryExists(outputJsonPath);

	const json = JSON.stringify(titles, null, 2);

	await fs.writeFile(outputJsonPath, json, "utf8");
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const defaultSectionRegex = [
		"^(",
		"глава\\s+\\d+",
		"|раздел\\s+\\d+",
		"|часть\\s+\\d+",
		"|§\\s*\\d+",
		"|\\d+\\.\\s+[А-ЯA-ZЁ]",
		"|\\d+\\.\\d+\\s+[А-ЯA-ZЁ]",
		")",
	].join("");

	const args = parseCommandLineArgs(process.argv.slice(2));

	const inputPdf = path.resolve(args.inputPdf);
	const outputPdf = path.resolve(args.outputPdf);
	const outputJson = path.resolve(args.outputJson);

	const sectionRegex = args.sectionRegex || defaultSectionRegex;

	const exists = await fileExists(inputPdf);

	if (!exists) {
		throw new Error(`Файл не найден: ${inputPdf}`);
	}

	const pagesToRemove = parsePages(args.pages);

	const pdfInfo = await removePagesFromPdf(
		inputPdf,
		outputPdf,
		pagesToRemove
	);

	const text = await extractTextFromPdf(outputPdf);

	const titles = extractSectionTitles(text, sectionRegex);

	await saveTitlesToJson(titles, outputJson);

	console.log("Готово.");
	console.log(`Исходный PDF: ${inputPdf}`);
	console.log(`Обработанный PDF: ${outputPdf}`);
	console.log(`JSON с названиями разделов: ${outputJson}`);
	console.log(`Страниц до обработки: ${pdfInfo.totalPagesBefore}`);
	console.log(`Страниц после обработки: ${pdfInfo.totalPagesAfter}`);
	console.log(`Удалённые страницы: ${[...pagesToRemove].sort((a, b) => a - b).join(", ") || "нет"}`);
	console.log(`Найдено названий разделов: ${titles.length}`);
}

main().catch(error => {
	console.error("Ошибка:");
	console.error(error.message || error);
	process.exit(1);
});