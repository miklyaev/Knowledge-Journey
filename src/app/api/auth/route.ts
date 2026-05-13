import { NextResponse } from 'next/server';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const baseUrl = getPublicApiBaseUrl();

		const res = await fetch(`${baseUrl}/api/auth`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		const data = await res.json();
		return NextResponse.json(data, { status: res.status });
	} catch (error) {
		console.error('Proxy Auth Error:', error);
		return NextResponse.json({ error: 'Ошибка соединения с сервером авторизации' }, { status: 500 });
	}
}

export async function GET() {
	try {
		const baseUrl = getPublicApiBaseUrl();
		const res = await fetch(`${baseUrl}/api/auth`);
		const data = await res.json();
		return NextResponse.json(data, { status: res.status });
	} catch (error) {
		return NextResponse.json({ users: [] });
	}
}
