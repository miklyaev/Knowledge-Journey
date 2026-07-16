import { ChromaClient } from "chromadb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из backend/.env
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function testChromaConnection() {
    const chromaUrl = process.env.CHROMA_URL;
    const authToken = process.env.CHROMA_AUTH_TOKEN || process.env.CHROMA_SERVER_AUTH_CREDENTIALS;

    console.log(`🔍 Проверка подключения к ChromaDB по адресу: ${chromaUrl}`);
    if (authToken) {
        console.log("🔑 Используется токен авторизации");
    }

    const client = new ChromaClient({
        path: chromaUrl,
        ...(authToken && {
            auth: {
                provider: "token",
                credentials: authToken,
                header: "Authorization"
            }
        })
    });

    try {
        // 1. Проверка Heartbeat (доступность сервера)
        const heartbeat = await client.heartbeat();
        console.log(`✅ Сервер ChromaDB доступен (Heartbeat: ${heartbeat})`);

        // 2. Получение списка коллекций
        const collections = await client.listCollections();
        console.log(`✅ Соединение установлено. Найдено коллекций: ${collections.length}`);

        if (collections.length > 0) {
            console.log("Список коллекций:");
            collections.forEach(c => console.log(` - ${c.name}`));
        }

        // 3. Попытка получить конкретную коллекцию из проекта
        try {
            const collection = await client.getCollection({ name: "knowledge_base" });
            const count = await collection.count();
            console.log(`✅ Коллекция 'knowledge_base' найдена. Записей в ней: ${count}`);
        } catch (e) {
            console.log("ℹ️ Коллекция 'knowledge_base' пока не создана или недоступна.");
        }

    } catch (error) {
        console.error("❌ Ошибка подключения к ChromaDB:");
        console.error(`   Сообщение: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
            console.error("   Совет: Проверьте, запущен ли Docker-контейнер, проброшен ли порт 8000 и активен ли SSH-туннель.");
        }
    }
}

testChromaConnection();
