import { NextResponse } from 'next/server';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const baseUrl = getPublicApiBaseUrl();

		const res = await fetch(`${baseUrl}/api/ai/evaluate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			throw new Error(`Backend responded with ${res.status}`);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Proxy AI Evaluate Error:', error);
		return NextResponse.json({ error: 'Ошибка оценки ответа через ИИ' }, { status: 500 });
	}
}
