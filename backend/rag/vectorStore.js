import { ChromaClient } from 'chromadb';
import { getEmbedding } from './embeddings.js';

class VectorStore {
    constructor() {
        this.client = new ChromaClient({
            path: process.env.CHROMA_URL || 'http://chromadb:8000'
        });
        this.collection = null;
    }

    async init() {
        try {
            this.collection = await this.client.getOrCreateCollection({
                name: 'knowledge_base',
                metadata: { "hnsw:space": "cosine" }
            });
            console.log('ChromaDB collection initialized');
        } catch (error) {
            console.error('Failed to initialize ChromaDB collection:', error);
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

            ids.push(`${chunk.metadata.pdfId}_${chunk.metadata.chunkIndex}`);
            embeddings.push(embedding);
            metadatas.push(chunk.metadata);
            documents.push(chunk.text);
        }

        await this.collection.add({
            ids,
            embeddings,
            metadatas,
            documents
        });
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
