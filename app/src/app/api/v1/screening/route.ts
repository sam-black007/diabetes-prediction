import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://diabetes-prediction-api-9hx8.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = token;

    const res = await fetch(`${BACKEND_URL}/api/v1/screening`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Backend proxy error: ${err?.message || 'Failed to reach clinical API'}` },
      { status: 502 }
    );
  }
}
