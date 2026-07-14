import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Явно указываем путь к .env в папке backend
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function testRaw() {
    const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
    const url = `${chromaUrl.replace(/\/$/, "")}/api/v2/heartbeat`;
    
    console.log(`🔍 Используемый URL из .env: ${chromaUrl}`);
    console.log(`🌐 Отправка прямого запроса на V2 API: ${url}`);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Увеличим до 10 сек

        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);

        console.log(`📊 Статус: ${response.status} ${response.statusText}`);
        
        if (response.status === 401 || response.status === 403) {
            console.log("❌ Ошибка авторизации! Сервер требует токен.");
            console.log("Заголовки ответа:", JSON.stringify([...response.headers]));
        } else if (response.ok) {
            const data = await response.json();
            console.log("✅ Ответ получен:", data);
        } else {
            const text = await response.text();
            console.log("⚠️ Тело ответа:", text);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("❌ Ошибка: Превышено время ожидания (Timeout). Сервер не отвечает.");
            console.error("Возможные причины: Firewall блокирует пакеты или неверный IP.");
        } else {
            console.error("❌ Ошибка запроса:", error.message);
        }
    }
}

testRaw();
