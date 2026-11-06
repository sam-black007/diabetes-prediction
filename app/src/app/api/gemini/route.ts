import { NextRequest, NextResponse } from 'next/server';

const SERVER_GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  '';

const GEMINI_MODEL = 'gemini-1.5-flash';

export async function POST(req: NextRequest) {
  try {
    const { patientProfile, language = 'en', fastingMode = 'none', idrsScore, tgHdlRatio } = await req.json();

    if (!SERVER_GEMINI_KEY) {
      return NextResponse.json({ ok: false, error: 'API key not configured' }, { status: 200 });
    }

    const systemPrompt = `You are a consultant endocrinologist practicing under ICMR and RSSDI guidelines.
Generate an authoritative clinical laboratory evaluation for a South Asian patient:
- Fasting/Random Glucose: ${patientProfile.glucose ?? 'N/A'} mg/dL (${patientProfile.glucoseType ?? 'Fasting'})
- Blood Pressure: ${patientProfile.sbp ?? 120}/${patientProfile.dbp ?? 80} mmHg
- Asian-Indian BMI: ${patientProfile.bmi ?? 'N/A'} kg/m2 (Target 18.0-22.9, Overweight >=23, Obese >=25)
- MDRF IDRS Score: ${idrsScore ?? 'N/A'} / 100
- TG/HDL Atherogenic Index: ${tgHdlRatio ?? 'N/A'} (Cutoff < 2.0)
- Fasting State: ${fastingMode}
- Language: ${language}

Return strictly a valid JSON object with this exact structure, with NO surrounding markdown or backticks:
{
  "clinicalTriage": "A concise 2-sentence objective assessment of the patient's glycemic and cardiovascular risk.",
  "atherogenicAssessment": "Interpretation of the TG/HDL ratio and insulin resistance state.",
  "dietarySwaps": [
    { "staple": "White polished rice / Maida", "swap": "Foxtail or Barnyard Millet / Multigrain Atta", "clinicalReason": "Reduces glycemic index and blunts postprandial glucose spike." },
    { "staple": "Refined seed oils / Fried snacks", "swap": "Cold-pressed mustard/sesame oil + roasted chana", "clinicalReason": "Improves MUFA:PUFA ratio and lowers atherogenic small dense LDL." }
  ],
  "physicianOrders": [
    "Venous Fasting Plasma Glucose + 75g 2-Hour Oral Glucose Tolerance Test (OGTT)",
    "Venous HbA1c via NGSP-certified HPLC methodology",
    "Complete Fasting Lipid Profile (TG, HDL-C, Total Cholesterol, Calculated LDL)",
    "Urine Albumin-to-Creatinine Ratio (uACR) and Serum Creatinine"
  ]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${SERVER_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ ok: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
