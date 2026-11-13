import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.search || '';
    const token = req.headers.get('authorization');

    try {
      const sql = await getNeonSql();
      if (sql) {
        const rows = await sql`
          SELECT id, health_score, risk_category, created_at, input_json
          FROM screenings
          ORDER BY created_at DESC
          LIMIT 50;
        `;
        if (rows && rows.length > 0) {
          const screenings = rows.map((r: any) => ({
            id: r.id,
            health_score: r.health_score,
            risk_category: r.risk_category,
            created_at: r.created_at,
            glucose_mg_dl: r.input_json?.glucose_mg_dl,
            sbp: r.input_json?.sbp,
            dbp: r.input_json?.dbp,
          }));
          return NextResponse.json({
            screenings,
            total: screenings.length,
            limit: 50,
            offset: 0,
          });
        }
      }
    } catch (dbErr) {
      console.warn('[Neon History GET] fallback:', dbErr);
    }

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
