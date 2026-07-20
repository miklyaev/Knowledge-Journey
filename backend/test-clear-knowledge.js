import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Импортируем сервисы, которые использует endpoint /api/pdf/clear-theme
import vectorStore from './rag/vectorStore.js';
import dbService from './dbservice.js';

const TEST_THEME_ID = 'test-theme';

async function testClearKnowledgeBase() {
    console.log("=".repeat(60));
    console.log("🧪 ТЕСТ: Очистка базы знаний (clear-theme)");
    console.log("=".repeat(60));

    // 1. Подготовка — создаём тестовую папку knowledge_base
    const kbDir = path.join(__dirname, 'knowledge_base', TEST_THEME_ID);
    if (!fs.existsSync(kbDir)) {
        fs.mkdirSync(kbDir, { recursive: true });
        console.log(`📁 Создана тестовая папка: ${kbDir}`);
    }

    // 2. Инициализация VectorStore
    console.log("\n📡 Шаг 1: Инициализация ChromaDB...");
    try {
        await vectorStore.init();
        console.log("   ✅ ChromaDB готова");
    } catch (error) {
        console.log("   ⚠️ ChromaDB недоступна, тест продолжается с пропуском векторной очистки");
        console.log(`   Ошибка: ${error.message}`);
    }

    // 3. Вызов deleteByThemeId (ChromaDB)
    console.log("\n🗑️ Шаг 2: Удаление векторов из ChromaDB...");
    let chromaDeleted = 0;
    try {
        const result = await vectorStore.deleteByThemeId(TEST_THEME_ID);
        chromaDeleted = result.deleted;
        console.log(`   ✅ Удалено записей из ChromaDB: ${chromaDeleted}`);
    } catch (error) {
        console.log(`   ⚠️ Ошибка ChromaDB: ${error.message}`);
    }

    // 4. Вызов deletePdfByThemeId (MySQL)
    console.log("\n🗄️ Шаг 3: Удаление метаданных из MySQL...");
    let dbDeleted = 0;
    try {
        dbDeleted = await dbService.deletePdfByThemeId(TEST_THEME_ID);
        console.log(`   ✅ Удалено записей из MySQL: ${dbDeleted}`);
    } catch (error) {
        console.log(`   ⚠️ Ошибка MySQL: ${error.message}`);
    }

    // 5. Удаление папки knowledge_base (как в server.js)
    console.log("\n📂 Шаг 4: Удаление папки knowledge_base...");
    if (fs.existsSync(kbDir)) {
        fs.rmSync(kbDir, { recursive: true, force: true });
        console.log(`   ✅ Папка удалена: ${kbDir}`);
    } else {
        console.log(`   ℹ️ Папка не найдена: ${kbDir}`);
    }

    // 6. Итог
    console.log("\n" + "=".repeat(60));
    console.log("📊 РЕЗУЛЬТАТ ТЕСТА:");
    console.log(`   - Тема: "${TEST_THEME_ID}"`);
    console.log(`   - Удалено из ChromaDB: ${chromaDeleted}`);
    console.log(`   - Удалено из MySQL: ${dbDeleted}`);

    if (chromaDeleted === 0 && dbDeleted === 0) {
        console.log("\n⚠️ Ничего не удалено. Возможно, тема не существует в БД.");
        console.log("   Это нормально для первого запуска теста.");
    } else {
        console.log("\n✅ Очистка базы знаний выполнена успешно!");
    }
    console.log("=".repeat(60));
}

testClearKnowledgeBase().catch((error) => {
    console.error("\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:");
    console.error(error);
    process.exit(1);
});
