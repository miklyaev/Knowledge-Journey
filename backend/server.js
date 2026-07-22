// backend/server.js
import express from 'express';
import cors from 'cors';
import { GigaChat } from 'gigachat';
import { Agent } from 'node:https';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dbService from './dbservice.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parsePDF, extractSections } from './rag/pdfParser.js';
import { chunkBySection } from './rag/chunker.js';
import { initializeVectorStore, getVectorStoreInstance } from './rag/vectorStore.js';
import { cleanPdf, defaultSectionRegex, extractTextFromPdf, extractSectionTitles } from './rag/pdfCleanerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Настройка multer для загрузки PDF
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const themeId = req.body.themeId || 'default';
		const dir = path.join(__dirname, 'knowledge_base', themeId);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		cb(null, dir);
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		cb(null, `${uuidv4()}${ext}`);
	}
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

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
		console.log(logLine);
	});
	next();
});

// Эндпоинты для авторизации
app.post('/api/admin/login', async (req, res) => {
	try {
		const { login, password } = req.body;
		const adminLogin = process.env.ADMIN_LOGIN || 'admin';
		const adminPass = process.env.ADMIN_PASSWORD || 'admin';

		if (login === adminLogin && password === adminPass) {
			return res.json({ success: true });
		} else {
			return res.status(401).json({ error: 'Неверный логин или пароль администратора' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Ошибка сервера' });
	}
});

app.post('/api/auth', async (req, res) => {
	try {
		const { nickname, password, description } = req.body;

		if (!nickname || /^\\d/.test(nickname) || /\\s/.test(nickname)) {
			return res.status(400).json({ error: 'Недопустимый никнейм' });
		}

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
	} catch (error) {
		console.error('Auth error:', error);
		res.status(500).json({ error: 'Ошибка сервера авторизации' });
	}
});

app.get('/api/auth', async (req, res) => {
	try {
		const users = await dbService.getAllUsers();
		return res.json({ users });
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
			// Читайте ниже, как можно включить проверку сертификата Мин. Цифры
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

// Инициализация векторного хранилища при старте сервера
const initializeVectorStoreOnStart = async () => {
	try {
		const store = await initializeVectorStore();
		if (store) {
			console.log('✅ VectorStore initialized successfully');
		} else {
			console.warn('⚠️ VectorStore initialization failed - RAG features may not work');
		}
	} catch (error) {
		console.warn('⚠️ VectorStore initialization error:', error.message);
	}
};

// Функция для логирования запросов к нейросетям в базу данных
const logRequest = async (aiProvider, prompt, referrer) => {
	try {
		const referrerValue = referrer || 'не указан';

		// Insert request data into the database
		await dbService.insertRequest(aiProvider, referrerValue, prompt);

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
		const { prompt, systemPrompt: customSystemPrompt, topicPrompt, pdfId, selectedSection, themeId } = req.body;
		let systemPrompt = customSystemPrompt || getSystemPrompt();

		// RAG: Получение контекста
		if (pdfId && gigachatClient) {
			try {
				const vectorStoreInstance = getVectorStoreInstance();
				if (vectorStoreInstance) {
					const chunks = await vectorStoreInstance.searchChunks(
						gigachatClient,
						prompt,
						{ pdfId, sectionTitle: selectedSection, themeId }
					);
					if (chunks && chunks.length > 0) {
						const context = chunks.map(c => c.text).join('\\n---\\n');
						systemPrompt += `\\n\\nКонтекст из базы знаний:\\n---\\n${context}\\n---\\nИспользуй этот контекст для ответа на вопрос.`;
					}
				}
			} catch (ragError) {
				console.error('RAG Error in GigaChat generate:', ragError);
			}
		}
		if (topicPrompt) {
			const lines = systemPrompt.split('\\n');
			lines[0] = topicPrompt;
			systemPrompt = lines.join('\\n');
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
			topicPrompt,
			pdfId,
			selectedSection,
			themeId
		} = req.body;
		let systemPrompt = customSystemPrompt || getSystemPrompt();

		// RAG: Получение контекста
		if (pdfId && gigachatClient) {
			try {
				const vectorStoreInstance = getVectorStoreInstance();
				if (vectorStoreInstance) {
					const chunks = await vectorStoreInstance.searchChunks(
						gigachatClient,
						prompt,
						{ pdfId, sectionTitle: selectedSection, themeId }
					);
					if (chunks && chunks.length > 0) {
						const context = chunks.map(c => c.text).join('\\n---\\n');
						systemPrompt += `\\n\\nКонтекст из базы знаний:\\n---\\n${context}\\n---\\nИспользуй этот контекст для ответа на вопрос.`;
					}
				}
			} catch (ragError) {
				console.error('RAG Error in YandexGPT generate:', ragError);
			}
		}
		if (topicPrompt) {
			const lines = systemPrompt.split('\\n');
			lines[0] = topicPrompt;
			systemPrompt = lines.join('\\n');
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

		const prompt = `Вопрос: ${question}\\nОтвет студента: ${answer}`;

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
		const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
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
		res.status(500).json({
			error: 'Failed to evaluate answer',
			score: 2,
			feedback: "Ошибка при связи с ИИ. Начислено минимальное количество баллов."
		});
	}
});

// Эндпоинт для получения всех отчетов пользователя
app.get('/api/reports/:username', async (req, res) => {
	try {
		const { username } = req.params;
		const dbReports = await dbService.getReportsByUsername(username);
		if (dbReports !== null) {
			return res.json(dbReports);
		}
		res.json([]);
	} catch (error) {
		console.error('Error fetching reports:', error);
		res.status(500).json({ error: 'Failed to fetch reports' });
	}
});

// Эндпоинт для загрузки и индексации PDF
app.post('/api/pdf/upload', upload.single('pdf'), async (req, res) => {
	try {
		const { themeId, processPdf, pagesToRemove, sectionRegex } = req.body;
		const file = req.file;

		if (!file) {
			return res.status(400).json({ error: 'Файл не загружен' });
		}

		const pdfId = path.basename(file.filename, path.extname(file.filename));
		const filePath = file.path;

		// 0. Опциональная очистка PDF (удаление страниц, извлечение разделов)
		let cleanedSections = null;
		let cleanedPdfPath = filePath;

		if (processPdf === 'true') {
			console.log('Starting PDF cleaning (remove pages, extract sections)...');
			const ext = path.extname(filePath);
			const cleanedPath = filePath.replace(ext, `_cleaned${ext}`);
			const result = await cleanPdf(filePath, cleanedPath, pagesToRemove || '', sectionRegex || '');
			cleanedPdfPath = cleanedPath;
			cleanedSections = result.sections.map((title, index) => ({
				id: `${pdfId}_clean_${index}`,
				title
			}));
			console.log(`PDF cleaned: pages removed ${result.pdfInfo.removedPages.join(',')}, sections found: ${result.sections.length}`);
		}

		// 1. Парсинг
		console.log('Starting PDF parsing...');
		const text = await parsePDF(cleanedPdfPath);
		console.log('PDF parsed successfully, text length:', text.length);

		// 2. Извлечение разделов
		console.log('Extracting sections...');
		const sections = extractSections(text);
		console.log('Extracted sections:', sections.length);

		// 3. Чанкинг
		console.log('Chunking sections...');
		const chunks = chunkBySection(sections, pdfId, themeId);
		console.log('Total chunks created:', chunks.length);

		if (chunks.length === 0) {
			console.warn('⚠️ После парсинга PDF не удалось получить текстовые чанки. Возможная причина: PDF состоит из сканов/изображений без текстового слоя.');
		}

		// 4. Векторизация и сохранение в ChromaDB
		let vectorizationSummary = null;
		if (gigachatClient) {
			console.log('Adding chunks to VectorStore...');
			try {
				const vectorStoreInstance = getVectorStoreInstance();
				if (vectorStoreInstance) {
					vectorizationSummary = await vectorStoreInstance.addChunks(gigachatClient, chunks);
					console.log('Chunks added to VectorStore');
				} else {
					console.warn('VectorStore not initialized, skipping vectorization');
					vectorizationSummary = {
						error: 'ChromaDB недоступна: векторное хранилище не инициализировано',
						added: 0,
						skipped: 0,
						skippedEmptyText: 0,
						total: 0
					};
				}
			} catch (vsError) {
				console.error('VectorStore Error:', vsError.message);
				vectorizationSummary = {
					error: vsError.message,
					added: 0,
					skipped: 0,
					skippedEmptyText: 0,
					total: 0
				};
			}
		} else {
			console.warn('GigaChat client not initialized, skipping vectorization');
			vectorizationSummary = {
				error: 'GigaChat клиент не инициализирован, векторизация недоступна',
				added: 0,
				skipped: 0,
				skippedEmptyText: 0,
				total: 0
			};
		}

		// 5. Сохранение метаданных в MySQL
		console.log('Saving metadata to MySQL...');
		const sectionList = sections.map((s, index) => ({
			id: `${pdfId}_${index}`,
			title: s.title
		}));
		await dbService.savePdfMetadata(pdfId, themeId, file.originalname, sectionList);
		console.log('Metadata saved successfully');
		res.json({
			pdfId,
			filename: file.originalname,
			sections: sectionList,
			vectorization: vectorizationSummary,
			cleanedSections
		});
	} catch (error) {
		console.error('PDF Upload/Index Error:', error);
		res.status(500).json({
			error: 'Ошибка при обработке PDF',
			details: error.message
		});
	}
});

app.post('/api/pdf/test-regex', upload.single('pdf'), async (req, res) => {
	try {
		const file = req.file;
		const { sectionRegex, pagesToRemove } = req.body;

		if (!file) {
			return res.status(400).json({ error: 'Файл не загружен' });
		}

		if (!sectionRegex) {
			fs.unlink(file.path, () => { });
			return res.status(400).json({ error: 'Регулярное выражение не указано' });
		}

		const filePath = file.path;
		let cleanedPath = null;

		try {
			// Применяем ту же очистку (удаление страниц), что и в основном эндпоинте
			cleanedPath = filePath.replace(/\.pdf$/i, '_cleaned_test.pdf');
			const result = await cleanPdf(filePath, cleanedPath, pagesToRemove || '', sectionRegex || '');

			res.json({
				success: true,
				sectionCount: result.sections.length,
				sections: result.sections.map((title, index) => ({
					id: `test_${index}`,
					title
				})),
				textLength: result.text.length,
				pagesRemoved: result.pdfInfo.removedPages
			});
		} finally {
			// Удаляем временные файлы
			try {
				if (cleanedPath) fs.unlinkSync(cleanedPath);
			} catch (_) { }
			try {
				fs.unlinkSync(file.path);
			} catch (_) { }
		}
	} catch (error) {
		console.error('PDF Test Regex Error:', error);
		res.status(500).json({
			error: 'Ошибка при тестировании регулярного выражения',
			details: error.message
		});
	}
});

app.get('/api/pdf/sections/:pdfId', async (req, res) => {
	try {
		const { pdfId } = req.params;
		const sections = await dbService.getPdfSections(pdfId);
		if (!sections) {
			return res.status(404).json({ error: 'Разделы не найдены' });
		}
		res.json(sections);
	} catch (error) {
		console.error('Get Sections Error:', error);
		res.status(500).json({ error: 'Ошибка при получении разделов' });
	}
});

// Эндпоинт для получения PDF по теме
app.get('/api/pdf/by-theme/:themeId', async (req, res) => {
	try {
		const { themeId } = req.params;
		const pdfData = await dbService.getPdfByThemeId(themeId);
		if (!pdfData) {
			return res.status(404).json({ error: 'Привязка к источнику не найдена для этой темы' });
		}
		res.json(pdfData);
	} catch (error) {
		console.error('Get PDF by Theme Error:', error);
		res.status(500).json({ error: 'Ошибка при получении данных PDF' });
	}
});

// Эндпоинт для очистки данных темы из ChromaDB и MySQL
app.post('/api/pdf/clear-theme', async (req, res) => {
	try {
		const { themeId } = req.body;
		if (!themeId) {
			return res.status(400).json({ error: 'themeId обязателен' });
		}

		// 1. Удаляем векторы из ChromaDB
		const vectorStoreInstance = getVectorStoreInstance();
		let chromaDeleted = 0;
		if (vectorStoreInstance) {
			try {
				const result = await vectorStoreInstance.deleteByThemeId(themeId);
				chromaDeleted = result.deleted;
			} catch (vsError) {
				console.error('ChromaDB delete error:', vsError.message);
			}
		} else {
			console.warn('VectorStore не инициализирован, пропускаем очистку ChromaDB');
		}

		// 2. Удаляем метаданные из MySQL
		const dbDeleted = await dbService.deletePdfByThemeId(themeId);

		// 3. Удаляем файлы PDF из папки knowledge_base
		const kbDir = path.join(__dirname, 'knowledge_base', themeId);
		if (fs.existsSync(kbDir)) {
			fs.rmSync(kbDir, { recursive: true, force: true });
			console.log(`🗑️ Удалена папка знаний для темы "${themeId}"`);
		}

		res.json({
			success: true,
			message: `Тема "${themeId}" очищена`,
			chromaDeleted,
			dbDeleted
		});
	} catch (error) {
		console.error('Clear Theme Error:', error);
		res.status(500).json({
			error: 'Ошибка при очистке темы',
			details: error.message
		});
	}
});

// Эндпоинт для поиска в базе знаний (RAG retrieval)
app.post('/api/rag/retrieve', async (req, res) => {
	try {
		const { query, themeId, pdfId, sectionTitle, topK = 5 } = req.body;

		if (!gigachatClient) {
			return res.status(500).json({ error: 'GigaChat клиент не инициализирован' });
		}

		const vectorStoreInstance = getVectorStoreInstance();
		if (!vectorStoreInstance) {
			return res.status(500).json({ error: 'VectorStore не инициализирован' });
		}

		const chunks = await vectorStoreInstance.searchChunks(
			gigachatClient,
			query,
			{ themeId, pdfId, sectionTitle },
			topK
		);
		res.json({ chunks });
	} catch (error) {
		console.error('RAG Retrieval Error:', error);
		res.status(500).json({ error: 'Ошибка при поиске в базе знаний' });
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

		const savedToDb = await dbService.saveReport(report);
		if (savedToDb) {
			return res.json({ success: true, message: 'Report saved to database' });
		} else {
			return res.status(500).json({ error: 'Failed to save report to database' });
		}
	} catch (error) {
		console.error('Error saving report:', error);
		res.status(500).json({
			error: 'Failed to save report',
			details: error.message
		});
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
		gigachat: gigachatClient ? 'initialized' : 'not_initialized',
		vectorstore: getVectorStoreInstance() ? 'initialized' : 'not_initialized'
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
		const errorMsg = `FATAL: Failed to connect to database: ${err.message}`;
		console.error(errorMsg);
		// Завершаем работу, так как БД теперь обязательна
		process.exit(1);
	});

// Инициализируем векторное хранилище после подключения к БД
initializeVectorStoreOnStart();

// Graceful shutdown handling
process.on('SIGINT', async () => {
	console.log('\\nShutting down gracefully...');
	await dbService.disconnect();
	process.exit(0);
});

const PORT = process.env.PORT || 3031;
const server = app.listen(PORT, () => {
	console.log(`GigaChat Proxy Server running on port ${PORT}`);
	if (gigachatClient) {
		console.log('GigaChat client initialized successfully');
	} else {
		console.warn('GigaChat client not initialized - check environment variables');
	}
	const vectorStoreInstance = getVectorStoreInstance();
	if (vectorStoreInstance) {
		console.log('VectorStore initialized successfully');
	} else {
		console.warn('VectorStore not initialized - RAG features may not work');
	}
});
server.timeout = 600000;
