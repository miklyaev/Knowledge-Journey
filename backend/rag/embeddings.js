import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';

// Используем gigachat.devices.sberbank.ru вместо ngw.devices.sberbank.ru
// так как он стабильнее работает со стандартными SSL-сертификатами
const BASE_URL = 'https://gigachat.devices.sberbank.ru/api/v1';
const AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';//'https://gigachat.devices.sberbank.ru/api/v2/oauth';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    // Для Windows 10 и Сбера иногда нужно явно разрешить старые шифры или ослабить уровень безопасности TLS
    ciphers: 'DEFAULT@SECLEVEL=1',
    minVersion: 'TLSv1.2'
});

// Кеш токена
let cachedToken = null;
let tokenExpiry = 0;

function buildAuthorizationHeaderValue() {
    // Согласно документации /post-token, в Authorization можно передавать готовый ключ авторизации
    // (base64 client_id:client_secret), который часто хранят в GIGACHAT_API_KEY.
    const apiKey = process.env.GIGACHAT_API_KEY?.trim();
    if (apiKey) {
        return apiKey.startsWith('Basic ') ? apiKey : `Basic ${apiKey}`;
    }

    // Fallback для обратной совместимости с текущим проектом.
    const clientId = process.env.GIGACHAT_CLIENT_ID?.trim();
    const clientSecret = process.env.GIGACHAT_CLIENT_SECRET?.trim();
    if (clientId && clientSecret) {
        const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        return `Basic ${encoded}`;
    }

    return null;
}

/**
 * Получает токен доступа GigaChat напрямую через API Sber.
 */
async function fetchAccessToken() {
    const authHeaderValue = buildAuthorizationHeaderValue();

    if (!authHeaderValue) {
        console.error('❌ Не заданы данные для OAuth GigaChat: укажите GIGACHAT_API_KEY или пару GIGACHAT_CLIENT_ID/GIGACHAT_CLIENT_SECRET');
        return null;
    }

    const scope = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
    const rquid = uuidv4();
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        const response = await axios.post(
            AUTH_URL,
            `scope=${encodeURIComponent(scope)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': authHeaderValue,
                    'RqUID': rquid,
                    'User-Agent': userAgent
                },
                httpsAgent,
                timeout: 15000
            }
        );

        if (response.data && response.data.access_token) {
            return {
                token: response.data.access_token,
                expiresAt: response.data.expires_at
            };
        }
        return null;
    } catch (error) {
        console.error('❌ GigaChat Auth Error:', error.response?.data || error.message);
        if (error.code === 'ECONNRESET') {
            console.error('💡 Ошибка ECONNRESET: Попробуйте проверить доступ к gigachat.devices.sberbank.ru');
        }
        return null;
    }
}

/**
 * Получает эмбеддинг для текста через GigaChat API (прямой запрос).
 */
export async function getEmbedding(_gigachatClient, text) {
    try {
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").trim();
        if (!cleanText) return null;

        // 1. Пытаемся взять токен из кеша или получить новый
        if (!cachedToken || Date.now() >= tokenExpiry) {
            const tokenData = await fetchAccessToken();
            if (tokenData) {
                cachedToken = tokenData.token;
                tokenExpiry = tokenData.expiresAt - 60000; // Запас 1 минута
                console.log('✅ GigaChat Access Token updated');
            }
        }

        if (!cachedToken) {
            console.error('❌ GigaChat Token not found.');
            return null;
        }

        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const response = await axios.post(`${BASE_URL}/embeddings`,
            {
                model: 'Embeddings',
                input: [cleanText]
            },
            {
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent
                },
                httpsAgent,
                timeout: 30000
            }
        );

        if (response.data && response.data.data && response.data.data[0]) {
            return response.data.data[0].embedding;
        }

        console.error('❌ Unexpected GigaChat response format:', response.data);
        return null;
    } catch (error) {
        if (error.response?.status === 401) {
            cachedToken = null; // Сбрасываем протухший токен
        }
        console.error('❌ GigaChat Embedding Error:', error.response?.data || error.message);
        return null;
    }
}

