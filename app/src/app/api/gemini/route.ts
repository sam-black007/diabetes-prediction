import { NextRequest, NextResponse } from 'next/server';

const SERVER_GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  '';

const GEMINI_MODEL = 'gemini-1.5-flash';

const LANGUAGE_PROMPTS: Record<string, string> = {
  en: 'Respond in clear, clinical English.',
  hi: 'Respond in culturally fluent Hindi (हिंदी), using standard Devanagari script for medical guidance.',
  ta: 'Respond in respectful, fluent Tamil (தமிழ்) using proper clinical terminology.',
  te: 'Respond in respectful, fluent Telugu (తెలుగు) using proper clinical terminology.',
  bn: 'Respond in respectful, fluent Bengali (বাংলা) using proper clinical terminology.',
};

export async function POST(req: NextRequest) {
  try {
    const { patientProfile, language = 'en', fastingMode = 'none', idrsScore, tgHdlRatio } = await req.json();
    const langInstruction = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;
    const fastingInstruction =
      fastingMode !== 'none'
        ? `The patient observes religious fasting / festival eating (${fastingMode}). Provide concrete carbohydrate guidance: advise against high-GI vrat foods (e.g., sabudana, fried potatoes) and recommend low-GI alternatives like Samak/Barnyard millet.`
        : 'Standard everyday Indian dietary context.';

    const systemPrompt = `You are a chief diabetologist practicing under ICMR and RSSDI standards.
Patient Profile (South Asian Demographics):
- Blood Glucose: ${patientProfile.glucose ?? 'N/A'} mg/dL (${patientProfile.glucoseType ?? 'Fasting'})
- Blood Pressure: ${patientProfile.sbp ?? 120}/${patientProfile.dbp ?? 80} mmHg
- BMI: ${patientProfile.bmi ?? 'N/A'} (Asian-Indian Cutoffs: Normal 18.0-22.9, Overweight 23.0-24.9, Obese >=25.0)
- HbA1c: ${patientProfile.hba1c ?? 'N/A'}%
- Madras Diabetes Research Foundation (IDRS) Score: ${idrsScore ?? 'N/A'}/100
- Atherogenic Dyslipidemia TG/HDL Ratio: ${tgHdlRatio ?? 'N/A'} (South Asian phenotype target: <2.0)
- Dietary/Fasting Context: ${fastingInstruction}

Language Requirement: ${langInstruction}

Clinical Objectives:
1. Provide a rigorous, culturally grounded risk assessment.
2. Outline specific South Asian nutritional interventions (millet swaps like Ragi, Foxtail, Bajra; limiting white polished rice and refined flour).
3. If TG/HDL is elevated (>=3.0), highlight atherogenic dyslipidemia and visceral insulin resistance risks.
4. Output structured, professional clinical sections: Risk Summary, Clinical Recommendations, Dietary & Millet Guidance, and Next Confirmatory Steps.`;

    if (!SERVER_GEMINI_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server environment.' },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${SERVER_GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const insights = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No clinical assessment generated.';
    return NextResponse.json({ insights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
