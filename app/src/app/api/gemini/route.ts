import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-3.5-flash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, key, prompt, contents, generationConfig } = body;

    // Resolve API key: either passed in body or from server environment variable
    const apiKey = key || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key configured. Provide a key or set GEMINI_API_KEY.' },
        { status: 400 }
      );
    }

    if (action === 'test') {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}?key=${encodeURIComponent(apiKey)}`
      );
      const testData = await testRes.json();
      if (!testRes.ok) {
        return NextResponse.json({ ok: false, error: testData?.error?.message ?? 'Invalid API key' }, { status: 400 });
      }
      return NextResponse.json({ ok: true, model: testData?.displayName ?? GEMINI_MODEL });
    }

    // Default action: generateContent
    const payload = contents
      ? { contents, generationConfig: generationConfig ?? { temperature: 0.4, maxOutputTokens: 1000 } }
      : { contents: [{ parts: [{ text: prompt }] }], generationConfig: generationConfig ?? { temperature: 0.4, maxOutputTokens: 1000 } };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'Gemini API generation error' },
        { status: response.status }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return NextResponse.json({ ok: true, text, candidates: data.candidates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
