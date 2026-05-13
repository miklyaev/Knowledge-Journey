import { NextResponse } from 'next/server';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const baseUrl = getPublicApiBaseUrl();
		
		const res = await fetch(`${baseUrl}/api/save-report`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		const data = await res.json();
		return NextResponse.json(data, { status: res.status });
	} catch (error) {
		console.error('Proxy Save Report Error:', error);
		return NextResponse.json({ error: 'Ошибка сохранения отчета на сервере' }, { status: 500 });
	}
}
