const fs = require('fs');

// pdfjs-dist v5+ — ESM-only, загружаем динамически
async function getPdfjs() {
	const pdfjsLib = await import('pdfjs-dist');
	return pdfjsLib;
}

const HEADING_RE = /^(?!Б\d+\.\d+\.\d+)[А-ЯЁ][а-яёА-ЯЁ]*(?:\s+[а-яёА-ЯЁ]+){1,7}$/;

/**
 * Группирует текстовые элементы страницы в строки по координате Y
 */
function groupIntoLines(items, yTolerance = 2) {
	const lines = [];
	const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]); // сверху вниз

	let currentLine = null;
	for (const item of sorted) {
		const y = item.transform[5];
		const x0 = item.transform[4];
		const x1 = x0 + item.width;

		if (currentLine && Math.abs(currentLine.y - y) < yTolerance) {
			currentLine.text += item.str;
			currentLine.x0 = Math.min(currentLine.x0, x0);
			currentLine.x1 = Math.max(currentLine.x1, x1);
		} else {
			if (currentLine) lines.push(currentLine);
			currentLine = { text: item.str, y, x0, x1 };
		}
	}
	if (currentLine) lines.push(currentLine);

	return lines;
}

/**
 * Основная функция извлечения чанков по разделам
 */
async function extractChunks(pdfPath) {
	const data = new Uint8Array(fs.readFileSync(pdfPath));
	const pdfjs = await getPdfjs();
	const pdf = await pdfjs.getDocument({ data }).promise;

	const chunks = [];
	let currentTitle = null;
	let currentText = [];

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum);
		const viewport = page.getViewport({ scale: 1 });
		const pageWidth = viewport.width;
		const content = await page.getTextContent();

		const lines = groupIntoLines(content.items);

		for (const line of lines) {
			const text = line.text.trim();
			if (!text) continue;

			const center = (line.x0 + line.x1) / 2;
			const isCentered = Math.abs(center - pageWidth / 2) < pageWidth * 0.1;

			if (isCentered && HEADING_RE.test(text)) {
				if (currentTitle) {
					chunks.push({
						title: currentTitle,
						text: currentText.join('\n').trim(),
					});
				}
				currentTitle = text;
				currentText = [];
			} else {
				currentText.push(text);
			}
		}
	}

	if (currentTitle) {
		chunks.push({
			title: currentTitle,
			text: currentText.join('\n').trim(),
		});
	}

	return chunks;
}

module.exports = { extractChunks };

// CLI-запуск: node extractChunks.cjs <pdf-path>
if (require.main === module) {
	(async () => {
		const pdfPath = process.argv[2] || 'document.pdf';
		const chunks = await extractChunks(pdfPath);

		for (const c of chunks) {
			console.log(`=== ${c.title} ===`);
			console.log(c.text);
			console.log();
		}

		fs.writeFileSync('chunks.json', JSON.stringify(chunks, null, 2), 'utf-8');
	})();
}