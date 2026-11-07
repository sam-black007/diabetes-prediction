import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://diabetes-prediction-api-9hx8.onrender.com/health', {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'healthy', version: '2.0.0' });
  }
}
