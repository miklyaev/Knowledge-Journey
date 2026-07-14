/**
 * Получает эмбеддинг для текста через GigaChat SDK.
 * Использует массив [text] для предотвращения ошибок JSON в API.
 */
export async function getEmbedding(gigachatClient, text) {
    if (!gigachatClient) return null;

    try {
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").trim();
        if (!cleanText) return null;

        // Используем метод SDK, но гарантируем, что input - это массив [string]
        const response = await gigachatClient.embeddings({
            model: 'Embeddings',
            input: [cleanText]
        });

        if (response && response.data && response.data[0]) {
            return response.data[0].embedding;
        }

        return null;
    } catch (error) {
        console.error('❌ Error in getEmbedding:', error.message);
        return null;
    }
}

