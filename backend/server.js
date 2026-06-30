// backend/server.js
import express from 'express';
import cors from 'cors';
import { GigaChat } from 'gigachat';
import { Agent } from 'node:https';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dbService from './dbservice.js'; const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); app.use(cors());
app.use(express.json());

// Эндпоинт для проверки статуса БД
app.get('/api/db-status', (req, res) => {
	res.json({
		connected: dbService.isDbConnected,
		enabled: dbService.dbEnabled
	});
});
// Функция для записи логов в файл
const logToFile = (message) => {
	try {
		const logPath = path.join(__dirname, 'server.log');
		const timestamp = new Date().toLocaleString('ru-RU');
		fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf8');
	} catch (err) {
		console.error('Ошибка записи в лог-файл:', err);
	}
};

// Middleware для логирования всех входящих HTTP-запросов
app.use((req, res, next) => {
	// Исключаем запросы к health check из логов
	if (req.originalUrl === '/api/health') {
		return next();
	}

	const start = Date.now();
	res.on('finish', () => {
		const duration = Date.now() - start;
		const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
		const logLine = `${req.method} ${fullUrl} ${res.statusCode} - ${duration}ms`;
		logToFile(logLine);
	});
	next();
});

// Эндпоинты для авторизации
app.post('/api/auth', async (req, res) => {
	try {
		const { nickname, password, description } = req.body;

		if (!nickname || /^\d/.test(nickname) || /\s/.test(nickname)) {
			return res.status(400).json({ error: 'Недопустимый никнейм' });
		}

		if (dbService.dbEnabled) {
			const user = await dbService.getUserByUsername(nickname);

			if (user) {
				const isMatch = await bcrypt.compare(password, user.password);
				if (isMatch) {
					return res.json({ success: true, nickname });
				} else {
					return res.status(401).json({ error: 'Неверный пароль' });
				}
			} else {
				if (!description) {
					return res.json({ requiresDescription: true });
				}
				const hashedPassword = await bcrypt.hash(password, 10);
				const success = await dbService.createUser(nickname, hashedPassword, description);
				if (success) {
					return res.json({ success: true, nickname, isNew: true });
				} else {
					return res.status(500).json({ error: 'Ошибка при создании пользователя в БД' });
				}
			}
		} else {
			const usersDir = path.join(__dirname, 'users');
			if (!fs.existsSync(usersDir)) {
				fs.mkdirSync(usersDir);
			}

			const filePath = path.join(usersDir, `${nickname}.json`);
			const oldFilePath = path.join(usersDir, `${nickname}.txt`);

			if (fs.existsSync(oldFilePath)) {
				const savedPassword = fs.readFileSync(oldFilePath, 'utf8').trim();
				if (savedPassword === password) {
					return res.json({ success: true, nickname });
				} else {
					return res.status(401).json({ error: 'Неверный пароль' });
				}
			} else if (fs.existsSync(filePath)) {
				const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
				const isMatch = await bcrypt.compare(password, userData.password);
				if (isMatch) {
					return res.json({ success: true, nickname });
				} else {
					return res.status(401).json({ error: 'Неверный пароль' });
				}
			} else {
				if (!description) {
					return res.json({ requiresDescription: true });
				}
				const hashedPassword = await bcrypt.hash(password, 10);
				const userData = {
					password: hashedPassword,
					description: description
				};
				fs.writeFileSync(filePath, JSON.stringify(userData), 'utf8');
				return res.json({ success: true, nickname, isNew: true });
			}
		}
	} catch (error) {
		console.error('Auth error:', error);
		res.status(500).json({ error: 'Ошибка сервера авторизации' });
	}
});

app.get('/api/auth', async (req, res) => {
	try {
		if (dbService.dbEnabled) {
			const users = await dbService.getAllUsers();
			return res.json({ users });
		} else {
			const usersDir = path.join(__dirname, 'users');
			if (!fs.existsSync(usersDir)) return res.json({ users: [] });

			const files = fs.readdirSync(usersDir);
			const users = files
				.filter(file => file.endsWith('.txt') || file.endsWith('.json'))
				.map(file => file.replace(/\.(txt|json)$/, ''));

			const uniqueUsers = [...new Set(users)];
			res.json({ users: uniqueUsers });
		}
	} catch (error) {
		res.json({ users: [] });
	}
});
// Эндпоинт для получения списка тем из themeCollection.json
app.get('/api/themes', (req, res) => {
	try {
		const themesPath = path.join(__dirname, 'themeCollection.json');
		if (!fs.existsSync(themesPath)) {
			return res.status(404).json({ error: 'Файл тем не найден' });
		}
		const themesData = fs.readFileSync(themesPath, 'utf8');
		res.json(JSON.parse(themesData));
	} catch (error) {
		console.error('Error reading themes:', error);
		res.status(500).json({ error: 'Ошибка при загрузке тем' });
	}
});

// Функция для чтения системного промпта из файла
const getSystemPrompt = () => {
	try {
		const promptPath = path.join(__dirname, 'systemPrompt.md');
		return fs.readFileSync(promptPath, 'utf8');
	} catch (error) {
		console.error('Ошибка при чтении systemPrompt.md:', error);
		return "Ты преподаватель в высшем техническом заведении."; // Фолбэк
	}
};

// Обслуживание статических файлов frontend (для продакшена)
// Проверяем, есть ли папка public (статические файлы frontend)
app.use(express.static(path.join(__dirname, 'public')));
// Инициализация GigaChat клиента
let gigachatClient = null;

function initializeGigaChat() {
	const { GIGACHAT_CLIENT_ID, GIGACHAT_CLIENT_SECRET, GIGACHAT_API_KEY } = process.env;

	if (!GIGACHAT_API_KEY && (!GIGACHAT_CLIENT_ID || !GIGACHAT_CLIENT_SECRET)) {
		console.warn('GigaChat credentials (API Key or Client ID/Secret) not set in .env');
		return null;
	}
	try {
		// Инициализация GigaChat SDK
		// Примечание: API SDK может отличаться в зависимости от версии библиотеки
		// Если возникают ошибки, проверьте документацию: https://developers.sber.ru/docs/ru/gigachat/api

		const httpsAgent = new Agent({
			rejectUnauthorized: false, // Отключает проверку корневого сертификата
			// Читайте ниже как можно включить проверку сертификата Мин. Цифры
		});

		const client = new GigaChat({
			timeout: 600,
			model: 'GigaChat',
			credentials: `${GIGACHAT_API_KEY}`,
			//credentials: `${GIGACHAT_CLIENT_ID}:${GIGACHAT_CLIENT_SECRET}`,
			scope: 'GIGACHAT_API_PERS',
			httpsAgent: httpsAgent
		});
		return client;
	} catch (error) {
		console.error('Failed to initialize GigaChat client:', error);
		return null;
	}
}

// Инициализируем клиент при старте сервера
gigachatClient = initializeGigaChat();


// Функция для логирования запросов к нейросетям в базу данных
const logRequest = async (aiProvider, prompt, referrer) => {
	try {
		const referrerValue = referrer || 'не указан';

		// Insert request data into the database
		await dbService.insertRequest(aiProvider, referrerValue, prompt);

		// Логирование в файл (без тела промпта)
		logToFile(`AI_API_CALL: Provider=${aiProvider}, Referrer=${referrerValue}, PromptLength=${prompt?.length || 0}`);

		console.log(`Запрос успешно записан в БД: ${aiProvider}, длина промпта: ${prompt?.length || 0}`);
	} catch (error) {
		console.error('Ошибка при записи в базу данных:', {
			error: error.message,
			stack: error.stack,
			aiProvider,
			promptLength: prompt?.length || 0
		});
	}
};

// Прокси-эндпоинт для генерации текста
app.post('/api/gigachat/generate', async (req, res) => {
	try {
		const { prompt, systemPrompt: customSystemPrompt, topicPrompt } = req.body;
		let systemPrompt = customSystemPrompt || getSystemPrompt();

		if (topicPrompt) {
			const lines = systemPrompt.split('\n');
			lines[0] = topicPrompt;
			systemPrompt = lines.join('\n');
		}

		if (!gigachatClient) {
			return res.status(500).json({
				error: 'GigaChat клиент не инициализирован',
				details: 'Проверьте переменные окружения GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET'
			});
		}

		if (!prompt) {
			return res.status(400).json({
				error: 'Параметр prompt обязателен'
			});
		}

		// Логирование запроса
		const referrer = req.headers.referer || req.headers.referrer;
		logRequest('GigaChat', prompt, referrer).catch(err => console.error('Logging error:', err));

		// Используем SDK для генерации ответа
		// Примечание: Метод может отличаться в зависимости от версии SDK
		// Возможные варианты: gigachatClient.chat.createCompletion() или gigachatClient.completions.create()
		const response = await gigachatClient.chat({
			model: 'GigaChat',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: prompt }
			],
			temperature: 0.7,
			max_tokens: 2000
		});

		const content = response.choices?.[0]?.message?.content || "Не удалось получить ответ.";

		res.json({
			content: content
		});
	} catch (error) {
		console.error('GigaChat Proxy Error:', error);
		res.status(500).json({
			error: 'Ошибка при обращении к GigaChat',
			details: error.name || 'Неизвестная ошибка'
		});
	}
});


// Прокси-эндпоинт для YandexGPT API
app.post('/api/yandexgpt/generate', async (req, res) => {
	try {
		const {
			prompt,
			systemPrompt: customSystemPrompt,
			topicPrompt
		} = req.body;
		let systemPrompt = customSystemPrompt || getSystemPrompt();

		if (topicPrompt) {
			const lines = systemPrompt.split('\n');
			lines[0] = topicPrompt;
			systemPrompt = lines.join('\n');
		}

		const { YANDEXGPT_API_KEY, YANDEXGPT_FOLDER_ID } = process.env;
		if (!YANDEXGPT_API_KEY || !YANDEXGPT_FOLDER_ID) {
			return res.status(500).json({
				error: 'YandexGPT API ключ или Folder ID не установлены',
				details: 'Проверьте переменные окружения YANDEXGPT_API_KEY и YANDEXGPT_FOLDER_ID'
			});
		}

		if (!prompt) {
			return res.status(400).json({
				error: 'Параметр prompt обязателен'
			});
		}

		// Логирование запроса
		const referrer = req.headers.referer || req.headers.referrer;
		logRequest('YandexGPT', prompt, referrer).catch(err => console.error('Logging error:', err));

		// Вызов YandexGPT API
		const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
		const requestBody = {
			modelUri: `gpt://${YANDEXGPT_FOLDER_ID}/yandexgpt/latest`,
			completionOptions: {
				stream: false,
				temperature: 0.6,
				maxTokens: "2000"
			},
			messages: [
				{
					role: "system",
					text: systemPrompt
				},
				{
					role: "user",
					text: prompt
				}
			]
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Api-Key ${YANDEXGPT_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || errorData.error?.message || `HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		const content = data.result?.alternatives?.[0]?.message?.text || "Не удалось получить ответ.";

		res.json({
			content: content
		});
	} catch (error) {
		console.error('YandexGPT Proxy Error:', error);
		res.status(500).json({
			error: 'Ошибка при обращении к YandexGPT API',
			details: error.message || 'Неизвестная ошибка'
		});
	}
});

// Эндпоинт для оценки свободного ответа через ИИ
app.post('/api/ai/evaluate', async (req, res) => {
	try {
		const { question, answer, provider = 'gigachat' } = req.body;
		if (!question || !answer) {
			return res.status(400).json({ error: 'Question and answer are required' });
		}

		const evaluationSystemPrompt = `Ты — строгий, но справедливый преподаватель. Твоя задача — оценить ответ студента на вопрос по десятибалльной шкале (от 0 до 10).
Правила оценки:
1. Если ответ в корне неверный, бессмысленный или пустой — ставь 0 баллов.
2. Если ответ частично верный, ставь от 3 до 6 баллов в зависимости от полноты.
3. Если ответ верный и точный, ставь от 7 до 10 баллов.
4. Ответ должен быть в формате JSON: {"score": число, "feedback": "краткое пояснение на русском языке"}.
5. Не пиши ничего, кроме JSON.`;

		const prompt = `Вопрос: ${question}\nОтвет студента: ${answer}`;

		let content = "";

		if (provider === 'gigachat' && gigachatClient) {
			const response = await gigachatClient.chat({
				model: 'GigaChat',
				messages: [
					{ role: 'system', content: evaluationSystemPrompt },
					{ role: 'user', content: prompt }
				],
				temperature: 0.3
			});
			content = response.choices?.[0]?.message?.content || "";
		} else {
			// По умолчанию YandexGPT
			const { YANDEXGPT_API_KEY, YANDEXGPT_FOLDER_ID } = process.env;
			const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Api-Key ${YANDEXGPT_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					modelUri: `gpt://${YANDEXGPT_FOLDER_ID}/yandexgpt/latest`,
					completionOptions: { temperature: 0.3, maxTokens: "1000" },
					messages: [
						{ role: "system", text: evaluationSystemPrompt },
						{ role: "user", text: prompt }
					]
				})
			});
			const data = await response.json();
			content = data.result?.alternatives?.[0]?.message?.text || "";
		}

		// Парсим JSON из ответа ИИ
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				const result = JSON.parse(jsonMatch[0]);
				res.json(result);
			} catch (parseError) {
				console.error('JSON Parse Error. Content:', content);
				throw new Error("Failed to parse AI evaluation JSON");
			}
		} else {
			console.error('No JSON found in AI response. Content:', content);
			throw new Error("Failed to find JSON in AI response");
		}
	} catch (error) {
		console.error('Evaluation Error:', error);
		res.status(500).json({ error: 'Failed to evaluate answer', score: 2, feedback: "Ошибка при связи с ИИ. Начислено минимальное количество баллов." });
	}
});

// Эндпоинт для получения всех отчетов пользователя
app.get('/api/reports/:username', async (req, res) => {
	try {
		const { username } = req.params;

		// 1. Пытаемся получить данные из БД
		const dbReports = await dbService.getReportsByUsername(username);
		if (dbReports !== null) {
			return res.json(dbReports);
		}

		// 2. Фолбэк на файловую систему, если БД недоступна
		const reportsDir = path.join(__dirname, 'reports');
		const filePath = path.join(reportsDir, `${username}.json`);

		if (!fs.existsSync(filePath)) {
			return res.json([]);
		}

		const fileData = fs.readFileSync(filePath, 'utf8');
		const reports = JSON.parse(fileData);
		res.json(Array.isArray(reports) ? reports : [reports]);
	} catch (error) {
		console.error('Error fetching reports:', error);
		res.status(500).json({ error: 'Failed to fetch reports' });
	}
});

// Эндпоинт для сохранения финального отчета
app.post('/api/save-report', async (req, res) => {
	try {
		const report = req.body;
		const { username } = report;

		if (!username) {
			return res.status(400).json({ error: 'Username is required' });
		}

		// 1. Пытаемся сохранить в БД
		const savedToDb = await dbService.saveReport(report);
		if (savedToDb) {
			return res.json({ success: true, message: 'Report saved to database' });
		}

		// 2. Фолбэк на файловую систему, если БД недоступна
		const reportsDir = path.join(__dirname, 'reports');
		if (!fs.existsSync(reportsDir)) {
			fs.mkdirSync(reportsDir);
		}

		const filePath = path.join(reportsDir, `${username}.json`);

		let reports = [];
		if (fs.existsSync(filePath)) {
			const fileData = fs.readFileSync(filePath, 'utf8');
			try {
				const parsedData = JSON.parse(fileData);
				reports = Array.isArray(parsedData) ? parsedData : [parsedData];
			} catch (e) {
				reports = [];
			}
		}

		const newEntry = {
			...report,
			timestamp: new Date().toLocaleString('ru-RU')
		};

		reports.push(newEntry);

		fs.writeFileSync(filePath, JSON.stringify(reports, null, 2));
		res.json({ success: true, message: 'Report saved to file (fallback)' });
	} catch (error) {
		console.error('Error saving report:', error);
		res.status(500).json({ error: 'Failed to save report', details: error.message });
	}
});
// Эндпоинт /api/data
app.get('/api/data', (req, res) => {
	res.json({
		status: 'success',
		data: {
			message: 'Данные успешно получены'
		}
	});
});

// Health check endpoint (should be BEFORE the fallback route)
app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		gigachat: gigachatClient ? 'initialized' : 'not_initialized'
	});
});

// Fallback для React Router (SPA) - должен быть последним маршрутом
app.get('*', (req, res) => {
	// Если запрос начинается с /api, не обрабатываем как SPA
	if (req.path.startsWith('/api')) {
		return res.status(404).json({ error: 'API endpoint not found' });
	}
	// Для всех остальных маршрутов отдаём index.html
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to database when server starts
dbService.connect()
	.then(() => {
		console.log('Database service connected successfully');
	})
	.catch(err => {
		console.error('Failed to connect to database:', err);
	});

// Graceful shutdown handling
process.on('SIGINT', async () => {
	console.log('\nShutting down gracefully...');
	await dbService.disconnect();
	process.exit(0);
});

const PORT = process.env.PORT || 3031;
app.listen(PORT, () => {
	console.log(`GigaChat Proxy Server running on port ${PORT}`);
	if (gigachatClient) {
		console.log('GigaChat client initialized successfully');
	} else {
		console.warn('GigaChat client not initialized - check environment variables');
	}
});
