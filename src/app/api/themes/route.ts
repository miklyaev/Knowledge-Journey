import { NextResponse } from 'next/server';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

export async function GET() {
	try {
		const baseUrl = getPublicApiBaseUrl();
		const res = await fetch(`${baseUrl}/api/themes`, {
			cache: 'no-store'
		});

		if (!res.ok) {
			throw new Error(`Backend responded with ${res.status}`);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Proxy Themes Error:', error);
		return NextResponse.json({ error: 'Ошибка загрузки тем с бэкенда' }, { status: 500 });
	}
}
