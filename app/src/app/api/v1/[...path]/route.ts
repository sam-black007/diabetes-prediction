import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = 'https://diabetes-prediction-api-9hx8.onrender.com';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subpath = (params.path || []).join('/');
  const search = req.nextUrl.search || '';
  const targetUrl = `${BACKEND_BASE}/api/v1/${subpath}${search}`;

  const headers = new Headers();
  req.headers.forEach((val, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      headers.set(key, val);
    }
  });

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });
    const data = await upstream.arrayBuffer();
    return new NextResponse(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || 'Proxy error' }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
