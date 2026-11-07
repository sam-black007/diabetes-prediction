import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.search || '';
    const token = req.headers.get('authorization');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = token;

    const res = await fetch(`https://diabetes-prediction-api-9hx8.onrender.com/api/v1/history${search}`, {
      headers,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ screenings: [], total: 0, limit: 20, offset: 0 });
  }
}
