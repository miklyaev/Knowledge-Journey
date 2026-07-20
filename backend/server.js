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
app.use(express.json());

// РќР°СЃС‚СЂРѕР№РєР° multer РґР»СЏ Р·Р°РіСЂСѓР·РєРё PDF
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
const upload = multer({ storage });
// Middleware РґР»СЏ Р»РѕРіРёСЂРѕРІР°РЅРёСЏ РІСЃРµС… РІС…РѕРґСЏС‰РёС… HTTP-Р·Р°РїСЂРѕСЃРѕРІ
app.use((req, res, next) => {
	// РСЃРєР»СЋС‡Р°РµРј Р·Р°РїСЂРѕСЃС‹ Рє health check РёР· Р»РѕРіРѕРІ
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

// Р­РЅРґРїРѕРёРЅС‚С‹ РґР»СЏ Р°РІС‚РѕСЂРёР·Р°С†РёРё
app.post('/api/admin/login', async (req, res) => {
	try {
		const { login, password } = req.body;
		const adminLogin = process.env.ADMIN_LOGIN || 'admin';
		const adminPass = process.env.ADMIN_PASSWORD || 'admin';

		if (login === adminLogin && password === adminPass) {
			return res.json({ success: true });
		} else {
			return res.status(401).json({ error: 'РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°' });
		}
	} catch (error) {
		res.status(500).json({ error: 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР°' });
	}
});

app.post('/api/auth', async (req, res) => {

	try {
		const { nickname, password, description } = req.body;

		if (!nickname || /^\\d/.test(nickname) || /\\s/.test(nickname)) {
			return res.status(400).json({ error: 'РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ РЅРёРєРЅРµР№Рј' });
		}

		const user = await dbService.getUserByUsername(nickname);

		if (user) {
			const isMatch = await bcrypt.compare(password, user.password);
			if (isMatch) {
				return res.json({ success: true, nickname });
			} else {
				return res.status(401).json({ error: 'РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ' });
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
				return res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РІ Р‘Р”' });
			}
		}
	} catch (error) {
		console.error('Auth error:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° Р°РІС‚РѕСЂРёР·Р°С†РёРё' });
	}
});

app.get('/api/auth', async (req, res) => {
	try {
		const users = await dbService.getAllUsers();
		return res.json({ users });
	} catch (error) {
		res.json({ users: [] });
	}
});// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ СЃРїРёСЃРєР° С‚РµРј РёР· themeCollection.json
app.get('/api/themes', (req, res) => {
	try {
		const themesPath = path.join(__dirname, 'themeCollection.json');
		if (!fs.existsSync(themesPath)) {
			return res.status(404).json({ error: 'Р¤Р°Р№Р» С‚РµРј РЅРµ РЅР°Р№РґРµРЅ' });
		}
		const themesData = fs.readFileSync(themesPath, 'utf8');
		res.json(JSON.parse(themesData));
	} catch (error) {
		console.error('Error reading themes:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ С‚РµРј' });
	}
});

// Р¤СѓРЅРєС†РёСЏ РґР»СЏ С‡С‚РµРЅРёСЏ СЃРёСЃС‚РµРјРЅРѕРіРѕ РїСЂРѕРјРїС‚Р° РёР· С„Р°Р№Р»Р°
const getSystemPrompt = () => {
	try {
		const promptPath = path.join(__dirname, 'systemPrompt.md');
		return fs.readFileSync(promptPath, 'utf8');
	} catch (error) {
		console.error('РћС€РёР±РєР° РїСЂРё С‡С‚РµРЅРёРё systemPrompt.md:', error);
		return "РўС‹ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЊ РІ РІС‹СЃС€РµРј С‚РµС…РЅРёС‡РµСЃРєРѕРј Р·Р°РІРµРґРµРЅРёРё."; // Р¤РѕР»Р±СЌРє
	}
};

// РћР±СЃР»СѓР¶РёРІР°РЅРёРµ СЃС‚Р°С‚РёС‡РµСЃРєРёС… С„Р°Р№Р»РѕРІ frontend (РґР»СЏ РїСЂРѕРґР°РєС€РµРЅР°)
// РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё РїР°РїРєР° public (СЃС‚Р°С‚РёС‡РµСЃРєРёРµ С„Р°Р№Р»С‹ frontend)
app.use(express.static(path.join(__dirname, 'public')));
// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ GigaChat РєР»РёРµРЅС‚Р°
let gigachatClient = null;

function initializeGigaChat() {
	const { GIGACHAT_CLIENT_ID, GIGACHAT_CLIENT_SECRET, GIGACHAT_API_KEY } = process.env;

	if (!GIGACHAT_API_KEY && (!GIGACHAT_CLIENT_ID || !GIGACHAT_CLIENT_SECRET)) {
		console.warn('GigaChat credentials (API Key or Client ID/Secret) not set in .env');
		return null;
	}
	try {
		// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ GigaChat SDK
		// РџСЂРёРјРµС‡Р°РЅРёРµ: API SDK РјРѕР¶РµС‚ РѕС‚Р»РёС‡Р°С‚СЊСЃСЏ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РІРµСЂСЃРёРё Р±РёР±Р»РёРѕС‚РµРєРё
		// Р•СЃР»Рё РІРѕР·РЅРёРєР°СЋС‚ РѕС€РёР±РєРё, РїСЂРѕРІРµСЂСЊС‚Рµ РґРѕРєСѓРјРµРЅС‚Р°С†РёСЋ: https://developers.sber.ru/docs/ru/gigachat/api

		const httpsAgent = new Agent({
			rejectUnauthorized: false, // РћС‚РєР»СЋС‡Р°РµС‚ РїСЂРѕРІРµСЂРєСѓ РєРѕСЂРЅРµРІРѕРіРѕ СЃРµСЂС‚РёС„РёРєР°С‚Р°
			// Р§РёС‚Р°Р№С‚Рµ РЅРёР¶Рµ РєР°Рє РјРѕР¶РЅРѕ РІРєР»СЋС‡РёС‚СЊ РїСЂРѕРІРµСЂРєСѓ СЃРµСЂС‚РёС„РёРєР°С‚Р° РњРёРЅ. Р¦РёС„СЂС‹
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

// РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РєР»РёРµРЅС‚ РїСЂРё СЃС‚Р°СЂС‚Рµ СЃРµСЂРІРµСЂР°
gigachatClient = initializeGigaChat();

// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ РІРµРєС‚РѕСЂРЅРѕРіРѕ С…СЂР°РЅРёР»РёС‰Р° РїСЂРё СЃС‚Р°СЂС‚Рµ СЃРµСЂРІРµСЂР°
const initializeVectorStoreOnStart = async () => {
	try {
		const store = await initializeVectorStore();
		if (store) {
			console.log('вњ… VectorStore initialized successfully');
		} else {
			console.warn('вљ пёЏ VectorStore initialization failed - RAG features may not work');
		}
	} catch (error) {
		console.warn('вљ пёЏ VectorStore initialization error:', error.message);
	}
};

// Р¤СѓРЅРєС†РёСЏ РґР»СЏ Р»РѕРіРёСЂРѕРІР°РЅРёСЏ Р·Р°РїСЂРѕСЃРѕРІ Рє РЅРµР№СЂРѕСЃРµС‚СЏРј РІ Р±Р°Р·Сѓ РґР°РЅРЅС‹С…
const logRequest = async (aiProvider, prompt, referrer) => {
	try {
		const referrerValue = referrer || 'РЅРµ СѓРєР°Р·Р°РЅ';

		// Insert request data into the database
		await dbService.insertRequest(aiProvider, referrerValue, prompt);

		console.log(`Р—Р°РїСЂРѕСЃ СѓСЃРїРµС€РЅРѕ Р·Р°РїРёСЃР°РЅ РІ Р‘Р”: ${aiProvider}, РґР»РёРЅР° РїСЂРѕРјРїС‚Р°: ${prompt?.length || 0}`);
	} catch (error) {
		console.error('РћС€РёР±РєР° РїСЂРё Р·Р°РїРёСЃРё РІ Р±Р°Р·Сѓ РґР°РЅРЅС‹С…:', {
			error: error.message,
			stack: error.stack,
			aiProvider,
			promptLength: prompt?.length || 0
		});
	}
};

// РџСЂРѕРєСЃРё-СЌРЅРґРїРѕРёРЅС‚ РґР»СЏ РіРµРЅРµСЂР°С†РёРё С‚РµРєСЃС‚Р°
app.post('/api/gigachat/generate', async (req, res) => {
	try {
		const { prompt, systemPrompt: customSystemPrompt, topicPrompt, pdfId, selectedSection, themeId } = req.body;
		let systemPrompt = customSystemPrompt || getSystemPrompt();

		// RAG: РџРѕР»СѓС‡РµРЅРёРµ РєРѕРЅС‚РµРєСЃС‚Р°
		if (pdfId && gigachatClient) {
			try {
				const vectorStoreInstance = getVectorStoreInstance();
				if (vectorStoreInstance) {
					const chunks = await vectorStoreInstance.searchChunks(gigachatClient, prompt, { pdfId, sectionTitle: selectedSection, themeId });
					if (chunks && chunks.length > 0) {
						const context = chunks.map(c => c.text).join('\\n---\\n');
						systemPrompt += `\\n\\nРљРѕРЅС‚РµРєСЃС‚ РёР· Р±Р°Р·С‹ Р·РЅР°РЅРёР№:\\n---\\n${context}\\n---\\nРСЃРїРѕР»СЊР·СѓР№ СЌС‚РѕС‚ РєРѕРЅС‚РµРєСЃС‚ РґР»СЏ РѕС‚РІРµС‚Р° РЅР° РІРѕРїСЂРѕСЃ.`;
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
				error: 'GigaChat РєР»РёРµРЅС‚ РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ',
				details: 'РџСЂРѕРІРµСЂСЊС‚Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ РѕРєСЂСѓР¶РµРЅРёСЏ GIGACHAT_CLIENT_ID Рё GIGACHAT_CLIENT_SECRET'
			});
		}

		if (!prompt) {
			return res.status(400).json({
				error: 'РџР°СЂР°РјРµС‚СЂ prompt РѕР±СЏР·Р°С‚РµР»РµРЅ'
			});
		}

		// Р›РѕРіРёСЂРѕРІР°РЅРёРµ Р·Р°РїСЂРѕСЃР°
		const referrer = req.headers.referer || req.headers.referrer;
		logRequest('GigaChat', prompt, referrer).catch(err => console.error('Logging error:', err));

		// РСЃРїРѕР»СЊР·СѓРµРј SDK РґР»СЏ РіРµРЅРµСЂР°С†РёРё РѕС‚РІРµС‚Р°
		// РџСЂРёРјРµС‡Р°РЅРёРµ: РњРµС‚РѕРґ РјРѕР¶РµС‚ РѕС‚Р»РёС‡Р°С‚СЊСЃСЏ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РІРµСЂСЃРёРё SDK
		// Р’РѕР·РјРѕР¶РЅС‹Рµ РІР°СЂРёР°РЅС‚С‹: gigachatClient.chat.createCompletion() РёР»Рё gigachatClient.completions.create()
		const response = await gigachatClient.chat({
			model: 'GigaChat',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: prompt }
			],
			temperature: 0.7,
			max_tokens: 2000
		});

		const content = response.choices?.[0]?.message?.content || "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РѕС‚РІРµС‚.";

		res.json({
			content: content
		});
	} catch (error) {
		console.error('GigaChat Proxy Error:', error);
		res.status(500).json({
			error: 'РћС€РёР±РєР° РїСЂРё РѕР±СЂР°С‰РµРЅРёРё Рє GigaChat',
			details: error.name || 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°'
		});
	}
});


// РџСЂРѕРєСЃРё-СЌРЅРґРїРѕРёРЅС‚ РґР»СЏ YandexGPT API
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

		// RAG: РџРѕР»СѓС‡РµРЅРёРµ РєРѕРЅС‚РµРєСЃС‚Р°
		if (pdfId && gigachatClient) {
			try {
				const vectorStoreInstance = getVectorStoreInstance();
				if (vectorStoreInstance) {
					const chunks = await vectorStoreInstance.searchChunks(gigachatClient, prompt, { pdfId, sectionTitle: selectedSection, themeId });
					if (chunks && chunks.length > 0) {
						const context = chunks.map(c => c.text).join('\\n---\\n');
						systemPrompt += `\\n\\nРљРѕРЅС‚РµРєСЃС‚ РёР· Р±Р°Р·С‹ Р·РЅР°РЅРёР№:\\n---\\n${context}\\n---\\nРСЃРїРѕР»СЊР·СѓР№ СЌС‚РѕС‚ РєРѕРЅС‚РµРєСЃС‚ РґР»СЏ РѕС‚РІРµС‚Р° РЅР° РІРѕРїСЂРѕСЃ.`;
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
				error: 'YandexGPT API РєР»СЋС‡ РёР»Рё Folder ID РЅРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅС‹',
				details: 'РџСЂРѕРІРµСЂСЊС‚Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ РѕРєСЂСѓР¶РµРЅРёСЏ YANDEXGPT_API_KEY Рё YANDEXGPT_FOLDER_ID'
			});
		}

		if (!prompt) {
			return res.status(400).json({
				error: 'РџР°СЂР°РјРµС‚СЂ prompt РѕР±СЏР·Р°С‚РµР»РµРЅ'
			});
		}

		// Р›РѕРіРёСЂРѕРІР°РЅРёРµ Р·Р°РїСЂРѕСЃР°
		const referrer = req.headers.referer || req.headers.referrer;
		logRequest('YandexGPT', prompt, referrer).catch(err => console.error('Logging error:', err));

		// Р’С‹Р·РѕРІ YandexGPT API
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
		const content = data.result?.alternatives?.[0]?.message?.text || "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РѕС‚РІРµС‚.";

		res.json({
			content: content
		});
	} catch (error) {
		console.error('YandexGPT Proxy Error:', error);
		res.status(500).json({
			error: 'РћС€РёР±РєР° РїСЂРё РѕР±СЂР°С‰РµРЅРёРё Рє YandexGPT API',
			details: error.message || 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°'
		});
	}
});

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РѕС†РµРЅРєРё СЃРІРѕР±РѕРґРЅРѕРіРѕ РѕС‚РІРµС‚Р° С‡РµСЂРµР· РР
app.post('/api/ai/evaluate', async (req, res) => {
	try {
		const { question, answer, provider = 'gigachat' } = req.body;
		if (!question || !answer) {
			return res.status(400).json({ error: 'Question and answer are required' });
		}

		const evaluationSystemPrompt = `РўС‹ вЂ” СЃС‚СЂРѕРіРёР№, РЅРѕ СЃРїСЂР°РІРµРґР»РёРІС‹Р№ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЊ. РўРІРѕСЏ Р·Р°РґР°С‡Р° вЂ” РѕС†РµРЅРёС‚СЊ РѕС‚РІРµС‚ СЃС‚СѓРґРµРЅС‚Р° РЅР° РІРѕРїСЂРѕСЃ РїРѕ РґРµСЃСЏС‚РёР±Р°Р»Р»СЊРЅРѕР№ С€РєР°Р»Рµ (РѕС‚ 0 РґРѕ 10).
РџСЂР°РІРёР»Р° РѕС†РµРЅРєРё:
1. Р•СЃР»Рё РѕС‚РІРµС‚ РІ РєРѕСЂРЅРµ РЅРµРІРµСЂРЅС‹Р№, Р±РµСЃСЃРјС‹СЃР»РµРЅРЅС‹Р№ РёР»Рё РїСѓСЃС‚РѕР№ вЂ” СЃС‚Р°РІСЊ 0 Р±Р°Р»Р»РѕРІ.
2. Р•СЃР»Рё РѕС‚РІРµС‚ С‡Р°СЃС‚РёС‡РЅРѕ РІРµСЂРЅС‹Р№, СЃС‚Р°РІСЊ РѕС‚ 3 РґРѕ 6 Р±Р°Р»Р»РѕРІ РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ РїРѕР»РЅРѕС‚С‹.
3. Р•СЃР»Рё РѕС‚РІРµС‚ РІРµСЂРЅС‹Р№ Рё С‚РѕС‡РЅС‹Р№, СЃС‚Р°РІСЊ РѕС‚ 7 РґРѕ 10 Р±Р°Р»Р»РѕРІ.
4. РћС‚РІРµС‚ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ С„РѕСЂРјР°С‚Рµ JSON: {"score": С‡РёСЃР»Рѕ, "feedback": "РєСЂР°С‚РєРѕРµ РїРѕСЏСЃРЅРµРЅРёРµ РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ"}.
5. РќРµ РїРёС€Рё РЅРёС‡РµРіРѕ, РєСЂРѕРјРµ JSON.`;

		const prompt = `Р’РѕРїСЂРѕСЃ: ${question}\\nРћС‚РІРµС‚ СЃС‚СѓРґРµРЅС‚Р°: ${answer}`;

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
			// РџРѕ СѓРјРѕР»С‡Р°РЅРёСЋ YandexGPT
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

		// РџР°СЂСЃРёРј JSON РёР· РѕС‚РІРµС‚Р° РР
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
		res.status(500).json({ error: 'Failed to evaluate answer', score: 2, feedback: "РћС€РёР±РєР° РїСЂРё СЃРІСЏР·Рё СЃ РР. РќР°С‡РёСЃР»РµРЅРѕ РјРёРЅРёРјР°Р»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ Р±Р°Р»Р»РѕРІ." });
	}
});

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ РІСЃРµС… РѕС‚С‡РµС‚РѕРІ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ Р·Р°РіСЂСѓР·РєРё Рё РёРЅРґРµРєСЃР°С†РёРё PDF
app.post('/api/pdf/upload', upload.single('pdf'), async (req, res) => {
	try {
		const { themeId, processPdf, pagesToRemove, sectionRegex } = req.body;
		const file = req.file;

		if (!file) {
			return res.status(400).json({ error: 'Р¤Р°Р№Р» РЅРµ Р·Р°РіСЂСѓР¶РµРЅ' });
		}

		const pdfId = path.basename(file.filename, path.extname(file.filename));
		const filePath = file.path;

		// 0. РћРїС†РёРѕРЅР°Р»СЊРЅР°СЏ РѕС‡РёСЃС‚РєР° PDF (СѓРґР°Р»РµРЅРёРµ СЃС‚СЂР°РЅРёС†, РёР·РІР»РµС‡РµРЅРёРµ СЂР°Р·РґРµР»РѕРІ)
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

		// 1. РџР°СЂСЃРёРЅРі
		console.log('Starting PDF parsing...');
		const text = await parsePDF(cleanedPdfPath);
		console.log('PDF parsed successfully, text length:', text.length);

		// 2. РР·РІР»РµС‡РµРЅРёРµ СЂР°Р·РґРµР»РѕРІ
		console.log('Extracting sections...');
		const sections = extractSections(text);
		console.log('Extracted sections:', sections.length);

		// 3. Р§Р°РЅРєРёРЅРі
		console.log('Chunking sections...');
		const chunks = chunkBySection(sections, pdfId, themeId);
		console.log('Total chunks created:', chunks.length);

		if (chunks.length === 0) {
			console.warn('вљ пёЏ РџРѕСЃР»Рµ РїР°СЂСЃРёРЅРіР° PDF РЅРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ С‚РµРєСЃС‚РѕРІС‹Рµ С‡Р°РЅРєРё. Р’РѕР·РјРѕР¶РЅР°СЏ РїСЂРёС‡РёРЅР°: PDF СЃРѕСЃС‚РѕРёС‚ РёР· СЃРєР°РЅРѕРІ/РёР·РѕР±СЂР°Р¶РµРЅРёР№ Р±РµР· С‚РµРєСЃС‚РѕРІРѕРіРѕ СЃР»РѕСЏ.');
		}

		// 4. Р’РµРєС‚РѕСЂРёР·Р°С†РёСЏ Рё СЃРѕС…СЂР°РЅРµРЅРёРµ РІ ChromaDB
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
					vectorizationSummary = { error: 'ChromaDB недоступна: векторное хранилище не инициализировано', added: 0, skipped: 0, skippedEmptyText: 0, total: 0 };
				}
			} catch (vsError) {
				console.error('VectorStore Error:', vsError.message);
vectorizationSummary = { error: vsError.message, added: 0, skipped: 0, skippedEmptyText: 0, total: 0 };
			}
} else {
			console.warn('GigaChat client not initialized, skipping vectorization');
			vectorizationSummary = { error: 'GigaChat клиент не инициализирован, векторизация недоступна', added: 0, skipped: 0, skippedEmptyText: 0, total: 0 };
		}
		// 5. РЎРѕС…СЂР°РЅРµРЅРёРµ РјРµС‚Р°РґР°РЅРЅС‹С… РІ MySQL
		console.log('Saving metadata to MySQL...');
		const sectionList = sections.map((s, index) => ({ id: `${pdfId}_${index}`, title: s.title }));
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
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё РѕР±СЂР°Р±РѕС‚РєРµ PDF', details: error.message });
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
			fs.unlink(file.path, () => {});
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
			try { if (cleanedPath) fs.unlinkSync(cleanedPath); } catch (_) {}
			try { fs.unlinkSync(file.path); } catch (_) {}
		}
	} catch (error) {
		console.error('PDF Test Regex Error:', error);
		res.status(500).json({ error: 'Ошибка при тестировании регулярного выражения', details: error.message });
	}
});

app.get('/api/pdf/sections/:pdfId', async (req, res) => {
	try {
		const { pdfId } = req.params;
		const sections = await dbService.getPdfSections(pdfId);
		if (!sections) {
			return res.status(404).json({ error: 'Р Р°Р·РґРµР»С‹ РЅРµ РЅР°Р№РґРµРЅС‹' });
		}
		res.json(sections);
	} catch (error) {
		console.error('Get Sections Error:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё СЂР°Р·РґРµР»РѕРІ' });
	}
});

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ PDF РїРѕ С‚РµРјРµ
app.get('/api/pdf/by-theme/:themeId', async (req, res) => {
	try {
		const { themeId } = req.params;
		const pdfData = await dbService.getPdfByThemeId(themeId);
		if (!pdfData) {
			return res.status(404).json({ error: 'РџСЂРёРІСЏР·РєР° Рє РёСЃС‚РѕС‡РЅРёРєСѓ РЅРµ РЅР°Р№РґРµРЅР° РґР»СЏ СЌС‚РѕР№ С‚РµРјС‹' });
		}
		res.json(pdfData);
	} catch (error) {
		console.error('Get PDF by Theme Error:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РґР°РЅРЅС‹С… PDF' });
	}
});


// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РѕС‡РёСЃС‚РєРё РґР°РЅРЅС‹С… С‚РµРјС‹ РёР· ChromaDB Рё MySQL
app.post('/api/pdf/clear-theme', async (req, res) => {
	try {
		const { themeId } = req.body;
		if (!themeId) {
			return res.status(400).json({ error: 'themeId РѕР±СЏР·Р°С‚РµР»РµРЅ' });
		}

		// 1. РЈРґР°Р»СЏРµРј РІРµРєС‚РѕСЂС‹ РёР· ChromaDB
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
			console.warn('VectorStore РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ, РїСЂРѕРїСѓСЃРєР°РµРј РѕС‡РёСЃС‚РєСѓ ChromaDB');
		}

		// 2. РЈРґР°Р»СЏРµРј РјРµС‚Р°РґР°РЅРЅС‹Рµ РёР· MySQL
		const dbDeleted = await dbService.deletePdfByThemeId(themeId);

		// 3. РЈРґР°Р»СЏРµРј С„Р°Р№Р»С‹ PDF РёР· РїР°РїРєРё knowledge_base
		const kbDir = path.join(__dirname, 'knowledge_base', themeId);
		if (fs.existsSync(kbDir)) {
			fs.rmSync(kbDir, { recursive: true, force: true });
			console.log(`рџ—‘пёЏ РЈРґР°Р»РµРЅР° РїР°РїРєР° Р·РЅР°РЅРёР№ РґР»СЏ С‚РµРјС‹ "${themeId}"`);
		}

		res.json({
			success: true,
			message: `РўРµРјР° "${themeId}" РѕС‡РёС‰РµРЅР°`,
			chromaDeleted,
			dbDeleted
		});
	} catch (error) {
		console.error('Clear Theme Error:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё РѕС‡РёСЃС‚РєРµ С‚РµРјС‹', details: error.message });
	}
});

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ РїРѕРёСЃРєР° РІ Р±Р°Р·Рµ Р·РЅР°РЅРёР№ (RAG retrieval)
app.post('/api/rag/retrieve', async (req, res) => {
	try {
		const { query, themeId, pdfId, sectionTitle, topK = 5 } = req.body;

		if (!gigachatClient) {
			return res.status(500).json({ error: 'GigaChat РєР»РёРµРЅС‚ РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ' });
		}

		const vectorStoreInstance = getVectorStoreInstance();
		if (!vectorStoreInstance) {
			return res.status(500).json({ error: 'VectorStore РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ' });
		}

		const chunks = await vectorStoreInstance.searchChunks(gigachatClient, query, { themeId, pdfId, sectionTitle }, topK);
		res.json({ chunks });
	} catch (error) {
		console.error('RAG Retrieval Error:', error);
		res.status(500).json({ error: 'РћС€РёР±РєР° РїСЂРё РїРѕРёСЃРєРµ РІ Р±Р°Р·Рµ Р·РЅР°РЅРёР№' });
	}
});

// Р­РЅРґРїРѕРёРЅС‚ РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ С„РёРЅР°Р»СЊРЅРѕРіРѕ РѕС‚С‡РµС‚Р°
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
		res.status(500).json({ error: 'Failed to save report', details: error.message });
	}
});// Р­РЅРґРїРѕРёРЅС‚ /api/data
app.get('/api/data', (req, res) => {
	res.json({
		status: 'success',
		data: {
			message: 'Р”Р°РЅРЅС‹Рµ СѓСЃРїРµС€РЅРѕ РїРѕР»СѓС‡РµРЅС‹'
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

// Fallback РґР»СЏ React Router (SPA) - РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РїРѕСЃР»РµРґРЅРёРј РјР°СЂС€СЂСѓС‚РѕРј
app.get('*', (req, res) => {
	// Р•СЃР»Рё Р·Р°РїСЂРѕСЃ РЅР°С‡РёРЅР°РµС‚СЃСЏ СЃ /api, РЅРµ РѕР±СЂР°Р±Р°С‚С‹РІР°РµРј РєР°Рє SPA
	if (req.path.startsWith('/api')) {
		return res.status(404).json({ error: 'API endpoint not found' });
	}
	// Р”Р»СЏ РІСЃРµС… РѕСЃС‚Р°Р»СЊРЅС‹С… РјР°СЂС€СЂСѓС‚РѕРІ РѕС‚РґР°С‘Рј index.html
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
		// Р—Р°РІРµСЂС€Р°РµРј СЂР°Р±РѕС‚Сѓ, С‚Р°Рє РєР°Рє Р‘Р” С‚РµРїРµСЂСЊ РѕР±СЏР·Р°С‚РµР»СЊРЅР°
		process.exit(1);
	});

// РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РІРµРєС‚РѕСЂРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Рє Р‘Р”
initializeVectorStoreOnStart();

// Graceful shutdown handling
process.on('SIGINT', async () => {
	console.log('\\nShutting down gracefully...');
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
	const vectorStoreInstance = getVectorStoreInstance();
	if (vectorStoreInstance) {
		console.log('VectorStore initialized successfully');
	} else {
		console.warn('VectorStore not initialized - RAG features may not work');
	}
});
