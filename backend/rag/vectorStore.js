import { ChromaClient } from 'chromadb';
import { getEmbedding } from './embeddings.js';

class VectorStore {
    constructor() {
        const chromaUrl = process.env.CHROMA_URL || 'http://127.0.0.1:8000';
        
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
     * Добавляет чанки в векторное хранилище.
     * @param {object} gigachatClient Клиент GigaChat для эмбеддингов
     * @param {Array<{text: string, metadata: object}>} chunks Чанки текста
     */
    async addChunks(gigachatClient, chunks) {
        if (!this.collection) await this.init();

        const ids = [];
        const embeddings = [];
        const metadatas = [];
        const documents = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await getEmbedding(gigachatClient, chunk.text);

            // Проверяем, что эмбеддинг не нулевой
            const isZeroEmbedding = !embedding || embedding.every(v => v === 0);
            
            if (!isZeroEmbedding) {
                // Гарантируем уникальный и строковый ID
                const pdfId = chunk.metadata.pdfId || 'unknown_doc';
                const chunkIndex = chunk.metadata.chunkIndex ?? i;
                const id = `${pdfId}_${chunkIndex}_${Date.now()}`;

                ids.push(id);
                embeddings.push(embedding);
                metadatas.push(chunk.metadata);
                documents.push(chunk.text);
            } else {
                console.warn(`⚠️ Пропускаем чанк ${i}: не удалось получить валидный эмбеддинг от GigaChat`);
            }
        }

        if (ids.length > 0) {
            await this.collection.add({
                ids,
                embeddings,
                metadatas,
                documents
            });
            console.log(`✅ Успешно добавлено ${ids.length} чанков в ChromaDB`);
        } else {
            console.error('❌ Нет валидных чанков для добавления в ChromaDB');
        }
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

const vectorStoreInstance = new VectorStore();
export default vectorStoreInstance;
