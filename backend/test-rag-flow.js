import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GigaChat } from 'gigachat';
import { Agent } from 'node:https';
import { chunkBySection } from './rag/chunker.js';
import vectorStore from './rag/vectorStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function testRagFlow() {
    console.log("🚀 Запуск теста RAG Flow (Chunking + GigaChat + ChromaDB)");

    // 1. Инициализация GigaChat
    const httpsAgent = new Agent({ rejectUnauthorized: false });
    const gigachatClient = new GigaChat({
        timeout: 600,
        model: 'GigaChat',
        credentials: process.env.GIGACHAT_API_KEY,
        scope: 'GIGACHAT_API_PERS',
        httpsAgent: httpsAgent
    });

    // 2. Тестовые данные
    const testSections = [
        {
            title: "Введение в ИИ",
            content: "Искусственный интеллект — это область компьютерных наук, которая занимается созданием систем, способных выполнять задачи, требующие человеческого интеллекта. Это включает в себя обучение, рассуждение и самокоррекцию."
        },
        {
            title: "История ИИ",
            content: "История ИИ началась в середине 20-го века. Алан Тьюринг предложил тест Тьюринга в 1950 году. Термин 'искусственный интеллект' был введен на Дартмутской конференции в 1956 году."
        }
    ];

    try {
        // 3. Чанкинг
        console.log("📦 Шаг 1: Чанкинг...");
        const chunks = chunkBySection(testSections, 'test-pdf', 'test-theme');
        console.log(`   - Создано чанков: ${chunks.length}`);
        
        // 4. Проверка ChromaDB (через туннель)
        console.log("📡 Шаг 2: Проверка связи с ChromaDB...");
        await vectorStore.init();
        console.log("   - ChromaDB готова.");

        // 5. Генерация эмбеддингов и сохранение
        console.log("🧠 Шаг 3: Генерация эмбеддингов через GigaChat и сохранение в ChromaDB...");
        // Мы используем метод addChunks, который внутри вызывает getEmbedding
        await vectorStore.addChunks(gigachatClient, chunks);
        console.log("   - Данные успешно векторизованы и сохранены.");

        // 6. Поиск для проверки
        console.log("🔍 Шаг 4: Тестовый поиск...");
        const query = "Кто предложил тест Тьюринга?";
        const results = await vectorStore.searchChunks(gigachatClient, query, { pdfId: 'test-pdf', themeId: 'test-theme' }, 1);
        
        if (results && results.length > 0) {
            console.log("✅ УСПЕХ! Результат поиска:");
            console.log(`   - Текст: ${results[0].text.substring(0, 100)}...`);
            console.log(`   - Метаданные:`, results[0].metadata);
        } else {
            console.log("❌ ОШИБКА: Поиск не дал результатов.");
        }

    } catch (error) {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:");
        console.error(error);
    }
}

testRagFlow();
