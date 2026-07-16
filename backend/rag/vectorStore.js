import { ChromaClient } from 'chromadb';
import { getEmbedding } from './embeddings.js';

// Глобальный инстанс векторного хранилища
let vectorStoreInstance = null;

class VectorStore {
    constructor() {
        const chromaUrl = process.env.CHROMA_URL;// || 'http://127.0.0.1:8000';

        // Разбираем URL для нового формата ChromaClient (V2)
        try {
            const url = new URL(chromaUrl);
            this.client = new ChromaClient({
                host: url.hostname,
                port: url.port || (url.protocol === 'https:' ? '443' : '80'),
                ssl: url.protocol === 'https:'
            });
        } catch (e) {
            console.warn('Invalid CHROMA_URL, falling back to default');
            this.client = new ChromaClient({ host: '127.0.0.1', port: 8000 });
        }

        this.collection = null;
    }

    async init() {
        try {
            // Явно указываем пустую функцию эмбеддингов, так как мы передаем свои векторы от GigaChat
            this.collection = await this.client.getOrCreateCollection({
                name: 'knowledge_base',
                metadata: { "hnsw:space": "cosine" },
                embeddingFunction: null
            });
            console.log('ChromaDB collection initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize ChromaDB collection:', error.message);
            throw new Error(`ChromaDB недоступна: ${error.message}`);
        }
    }

    /**
     * Инициализирует векторное хранилище при запуске сервера
     */
    static async initialize() {
        if (!vectorStoreInstance) {
            vectorStoreInstance = new VectorStore();
        }
        try {
            await vectorStoreInstance.init();
            return vectorStoreInstance;
        } catch (error) {
            console.warn('⚠️ VectorStore initialization failed:', error.message);
            return null;
        }
    }

    /**
     * Получает инстанс векторного хранилища
     */
    static getInstance() {
        return vectorStoreInstance;
    }

    /**
     * Добавляет чанки в векторное хранилище.
     * @param {object} gigachatClient Клиент GigaChat для эмбеддингов
     * @param {Array<{text: string, metadata: object}>} chunks Чанки текста
     */
    async addChunks(gigachatClient, chunks) {
        if (!this.collection) await this.init();

        const totalChunks = Array.isArray(chunks) ? chunks.length : 0;
        if (totalChunks === 0) {
            console.error('❌ Нет валидных чанков для добавления в ChromaDB: после парсинга/чанкинга список пуст');
            return { added: 0, skipped: 0, skippedEmptyText: 0, total: 0 };
        }

        const ids = [];
        const embeddings = [];
        const metadatas = [];
        const documents = [];

        let skippedCount = 0;
        let skippedEmptyText = 0;

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i];
            const chunkText = typeof chunk?.text === 'string' ? chunk.text.trim() : '';

            if (!chunkText) {
                skippedCount++;
                skippedEmptyText++;
                console.warn(`⚠️ Пропускаем чанк ${i}: пустой текст после очистки`);
                continue;
            }

            // Добавляем небольшую задержку (100мс), чтобы не спамить API Сбера
            // Это помогает избежать ECONNRESET при массовой загрузке
            await new Promise(resolve => setTimeout(resolve, 100));

            const embedding = await getEmbedding(gigachatClient, chunkText);

            // Проверяем, что эмбеддинг является массивом и не пустой
            const isValidEmbedding = Array.isArray(embedding) && embedding.length > 0;

            if (isValidEmbedding) {
                // Гарантируем уникальный и строковый ID
                const pdfId = chunk.metadata.pdfId || 'unknown_doc';
                const chunkIndex = chunk.metadata.chunkIndex ?? i;
                const id = `${pdfId}_${chunkIndex}_${Date.now()}_${i}`;

                ids.push(id);
                embeddings.push(embedding);
                metadatas.push(chunk.metadata);
                documents.push(chunkText);
            } else {
                skippedCount++;
                console.warn(`⚠️ Пропускаем чанк ${i}: не удалось получить валидный эмбеддинг от GigaChat. Текст чанка: "${chunkText.substring(0, 50)}..."`);
            }
        }

        if (ids.length > 0) {
            await this.collection.add({
                ids,
                embeddings,
                metadatas,
                documents
            });
            console.log(`✅ Успешно добавлено ${ids.length} чанков в ChromaDB (пропущено: ${skippedCount}, пустых: ${skippedEmptyText})`);
        } else {
            console.error(`❌ Нет валидных чанков для добавления в ChromaDB (всего: ${totalChunks}, пустых: ${skippedEmptyText}, с ошибкой эмбеддинга: ${skippedCount - skippedEmptyText})`);
        }

        return {
            added: ids.length,
            skipped: skippedCount,
            skippedEmptyText,
            total: totalChunks
        };
    }

    /**
     * Ищет релевантные чанки.
     * @param {object} gigachatClient Клиент GigaChat для эмбеддингов
     * @param {string} query Поисковый запрос
     * @param {object} filters Фильтры (pdfId, sectionTitle, themeId)
     * @param {number} topK Количество результатов
     */
    async searchChunks(gigachatClient, query, filters = {}, topK = 5) {
        if (!this.collection) await this.init();

        const queryEmbedding = await getEmbedding(gigachatClient, query);
        if (!queryEmbedding) {
            console.error('❌ Не удалось получить эмбеддинг для поискового запроса');
            return [];
        }

        const where = {};

        if (filters.pdfId) where.pdfId = filters.pdfId;
        if (filters.themeId) where.themeId = filters.themeId;
        if (filters.sectionTitle) where.sectionTitle = filters.sectionTitle;

        const results = await this.collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: topK,
            where: Object.keys(where).length > 0 ? where : undefined
        });

        return results.documents[0].map((doc, i) => ({
            text: doc,
            metadata: results.metadatas[0][i],
            distance: results.distances ? results.distances[0][i] : null
        }));
    }
}

const initializeVectorStore = async () => {
    return await VectorStore.initialize();
};

const getVectorStoreInstance = () => {
    return VectorStore.getInstance();
};

export { initializeVectorStore, getVectorStoreInstance };
export default new VectorStore();
