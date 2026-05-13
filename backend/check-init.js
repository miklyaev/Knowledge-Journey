
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { GIGACHAT_CLIENT_ID, GIGACHAT_CLIENT_SECRET, GIGACHAT_API_KEY } = process.env;

console.log('--- Проверка переменных окружения ---');
console.log('GIGACHAT_API_KEY:', GIGACHAT_API_KEY ? 'Установлен' : 'НЕТ');
console.log('GIGACHAT_CLIENT_ID:', GIGACHAT_CLIENT_ID ? 'Установлен' : 'НЕТ');
console.log('GIGACHAT_CLIENT_SECRET:', GIGACHAT_CLIENT_SECRET ? 'Установлен' : 'НЕТ');

const canInitialize = !!GIGACHAT_API_KEY || (!!GIGACHAT_CLIENT_ID && !!GIGACHAT_CLIENT_SECRET);

console.log('\nРезультат проверки условия инициализации:');
if (canInitialize) {
    console.log('✅ Успех: Клиент может быть инициализирован.');
} else {
    console.log('❌ Ошибка: Недостаточно данных для инициализации GigaChat.');
}

// Тест функции логирования
const logPath = path.join(__dirname, 'server.log');
const timestamp = new Date().toLocaleString('ru-RU');
const testMessage = `[${timestamp}] TEST: Проверка инициализации GigaChat - ${canInitialize ? 'OK' : 'FAIL'}`;

try {
    fs.appendFileSync(logPath, testMessage + '\n', 'utf8');
    console.log(`\n✅ Тестовая запись добавлена в ${logPath}`);
} catch (err) {
    console.error('\n❌ Ошибка записи в лог:', err);
}
