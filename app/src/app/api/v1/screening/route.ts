import { NextRequest, NextResponse } from 'next/server';
import { sql, initNeonSchema } from '@/lib/neon';

const BACKEND_URL = 'https://diabetes-prediction-api-9hx8.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.headers.get('authorization');

    // 1. Send to ML clinical engine
    const res = await fetch(`${BACKEND_URL}/api/v1/screening`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await res.json();

    // 2. Persist directly into Neon Postgres
    if (sql && res.ok && data.id) {
      try {
        await initNeonSchema();
        const userId = body.user_id || 'patient-google-default';
        await sql`
          INSERT INTO screenings (id, user_id, input_json, result_json, health_score, risk_category, created_at)
          VALUES (
            ${data.id},
            ${userId},
            ${JSON.stringify(body)},
            ${JSON.stringify(data)},
            ${data.health_score ?? 85},
            ${data.risk_category ?? 'low'},
            NOW()
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      } catch (dbErr) {
        console.warn('[Neon Postgres] Direct write fallback:', dbErr);
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `API gateway error: ${err?.message || 'Failed to reach clinical API'}` },
      { status: 502 }
    );
  }
}
