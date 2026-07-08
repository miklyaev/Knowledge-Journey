/**
 * Разбивает разделы на чанки фиксированного размера с перекрытием.
 * @param {Array<{title: string, content: string}>} sections Разделы PDF
 * @param {string} pdfId ID PDF файла
 * @param {string} themeId ID темы (например, 'csharp')
 * @param {number} chunkSize Размер чанка в символах
 * @param {number} chunkOverlap Перекрытие чанков
 * @returns {Array<{text: string, metadata: object}>} Список чанков
 */
export function chunkBySection(sections, pdfId, themeId, chunkSize = 1000, chunkOverlap = 200) {
    const allChunks = [];

    for (const section of sections) {
        const content = section.content;
        const title = section.title;

        let start = 0;
        let chunkIndex = 0;

        while (start < content.length) {
            const end = Math.min(start + chunkSize, content.length);
            const chunkText = content.substring(start, end);

            allChunks.push({
                text: `Раздел: ${title}\n\n${chunkText}`,
                metadata: {
                    pdfId,
                    themeId,
                    sectionTitle: title,
                    chunkIndex
                }
            });

            start += (chunkSize - chunkOverlap);
            chunkIndex++;

            if (start >= content.length) break;
        }
    }

    return allChunks;
}

// module.exports = {
//     chunkBySection
// };
