import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
	try {
		const { nickname, password } = await request.json();

		// Валидация никнейма: без пробелов, не начинается с цифр
		if (!nickname || /^\d/.test(nickname) || /\s/.test(nickname)) {
			return NextResponse.json({ error: 'Недопустимый никнейм' }, { status: 400 });
		}

		const usersDir = path.join(process.cwd(), 'users');
		if (!fs.existsSync(usersDir)) {
			fs.mkdirSync(usersDir);
		}

		const filePath = path.join(usersDir, `${nickname}.txt`);

		if (fs.existsSync(filePath)) {
			// Проверка пароля
			const savedPassword = fs.readFileSync(filePath, 'utf8').trim();
			if (savedPassword === password) {
				return NextResponse.json({ success: true, nickname });
			} else {
				return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
			}
		} else {
			// Регистрация нового пользователя
			fs.writeFileSync(filePath, password, 'utf8');
			return NextResponse.json({ success: true, nickname, isNew: true });
		}
	} catch (error) {
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
	}
}

export async function GET() {
	try {
		const usersDir = path.join(process.cwd(), 'users');
		if (!fs.existsSync(usersDir)) return NextResponse.json({ users: [] });

		const files = fs.readdirSync(usersDir);
		const users = files
			.filter(file => file.endsWith('.txt'))
			.map(file => file.replace('.txt', ''));

		return NextResponse.json({ users });
	} catch (error) {
		return NextResponse.json({ users: [] });
	}
}
