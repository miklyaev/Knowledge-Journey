import { NextResponse } from 'next/server';
import { getPublicApiBaseUrl } from '@/lib/apiBase';

export async function GET(
	request: Request,
	{ params }: { params: { username: string } }
) {
	try {
		const { username } = params;
		const baseUrl = getPublicApiBaseUrl();
		
		const res = await fetch(`${baseUrl}/api/reports/${username}`);
		const data = await res.json();
		
		return NextResponse.json(data, { status: res.status });
	} catch (error) {
		console.error('Proxy Fetch Reports Error:', error);
		return NextResponse.json({ error: 'Ошибка получения отчетов' }, { status: 500 });
	}
}
