/**
 * Google Gemini AI Integration for DiabetesRisk Intelligence
 * 
 * Supports Gemini 1.5 Flash / Gemini 2.0 Flash for:
 * 1. Dynamic clinical endocrinologist synthesis
 * 2. Interactive patient risk Q&A
 * 3. Multimodal lab report OCR extraction
 */

import type { ScreeningResult, ClinicalRule } from '@/lib/types';

export const GEMINI_STORAGE_KEY = 'dri_gemini_api_key';
export const GEMINI_MODEL = 'gemini-3.5-flash';

export interface GeminiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiClinicalSynthesis {
  summary: string;
  metabolicMechanics: string;
  physicianDiscussionPoints: string[];
  keyLifestylePriorities: string[];
  generatedBy: string;
  model: string;
  isSimulatedFallback?: boolean;
}

/**
 * Resolve the Gemini API key from localStorage or Next.js public environment variable.
 */
export function getGeminiApiKey(): string | null {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (local && local.trim().length > 0) return local.trim();
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? null;
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
  }
}

export function removeGeminiApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  }
}

/**
 * Validate a Gemini API key by testing the endpoint.
 */
export async function testGeminiApiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}?key=${encodeURIComponent(key)}`,
      { method: 'GET' }
    );
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}: ${res.statusText}`;
      return { ok: false, error: msg };
    }
    return { ok: true, model: data?.displayName ?? GEMINI_MODEL };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error testing Gemini API key';
    return { ok: false, error: msg };
  }
}

/**
 * Build a structured clinical context prompt from a screening result.
 */
function buildScreeningPrompt(result: ScreeningResult): string {
  const { input } = result;
  const bmi =
    input.height_cm && input.weight_kg
      ? (input.weight_kg / Math.pow(input.height_cm / 100, 2)).toFixed(1)
      : 'Unspecified';

  const allRules: ClinicalRule[] = [
    ...(result.glucose_rules ?? []),
    ...(result.bp_rule ? [result.bp_rule] : []),
    ...(result.bmi_rule ? [result.bmi_rule] : []),
    ...(result.lipid_rules ?? []),
  ];

  const triggeredRulesText = allRules
    .map((r: ClinicalRule) => `- [${r.severity.toUpperCase()}] ${r.metric}: ${r.interpretation} (${r.status})`)
    .join('\n');

  const mlProb = result.ml_result?.probability != null
    ? `${(result.ml_result.probability * 100).toFixed(1)}%`
    : 'N/A';

  return `You are a board-certified preventive diabetologist and clinical endocrinologist practicing under the American Diabetes Association (ADA) 2026 Standards of Care.

A patient has just completed a comprehensive diabetes risk evaluation with the following biomarkers:
- Risk Category: ${result.risk_category.toUpperCase()}
- Health Score: ${result.health_score}/100
- ML Model Probability: ${mlProb}
- Fasting/Current Glucose: ${input.glucose_mg_dl ?? 'Unspecified'} mg/dL (${input.glucose_type})
- Blood Pressure: ${input.sbp ?? 'Unspecified'}/${input.dbp ?? 'Unspecified'} mmHg
- Age: ${input.age ?? 'Unspecified'} years | Sex: ${input.sex ?? 'Unspecified'}
- Body Mass Index (BMI): ${bmi} kg/m² (Weight: ${input.weight_kg ?? 'N/A'} kg, Height: ${input.height_cm ?? 'N/A'} cm)
- Family History of Diabetes: ${input.family_history ? 'Positive (+)' : 'Negative (-)'}
- Lipids: HDL ${input.hdl_mg_dl ?? 'N/A'} mg/dL, LDL ${input.ldl_mg_dl ?? 'N/A'} mg/dL, Triglycerides ${input.triglycerides_mg_dl ?? 'N/A'} mg/dL

Clinical Rules Triggered:
${triggeredRulesText || 'None (Biomarkers within standard reference thresholds)'}

Generate a concise, clinically accurate, and patient-empowering assessment in strict JSON format with these exact keys:
{
  "summary": "A 2-sentence executive summary synthesizing their primary metabolic standing and immediate prognosis.",
  "metabolicMechanics": "A clear, empathetic paragraph explaining how their specific glucose, BP, BMI, and family history interact physiologically to influence beta-cell insulin sensitivity and vascular health.",
  "physicianDiscussionPoints": [
    "3 specific, high-yield questions or confirmatory tests (e.g. Oral Glucose Tolerance Test, hs-CRP, Coronary Artery Calcium, 24-hr Ambulatory BP) the patient should bring to their physician."
  ],
  "keyLifestylePriorities": [
    "3 evidence-based, highest-leverage lifestyle interventions calibrated to their specific risk factors."
  ]
}

Return ONLY valid JSON with no markdown wrapping or extra commentary.`;
}

/**
 * Generate dynamic clinical synthesis from Gemini.
 */
export async function generateGeminiClinicalSynthesis(
  result: ScreeningResult,
  customApiKey?: string
): Promise<GeminiClinicalSynthesis> {
  const apiKey = customApiKey || getGeminiApiKey();

  // If no Gemini key is provided, return an intelligent rule-calibrated fallback
  if (!apiKey) {
    return generateFallbackSynthesis(result);
  }

  const prompt = buildScreeningPrompt(result);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn('Gemini API call failed, falling back to simulated engine:', res.statusText);
      return generateFallbackSynthesis(result);
    }

    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    // Clean potential markdown backticks ```json ... ```
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary ?? 'Your metabolic biomarkers indicate a moderate opportunity for proactive risk reduction.',
      metabolicMechanics: parsed.metabolicMechanics ?? 'Peripheral insulin sensitivity is modulated by dietary glycemic index and physical activity levels.',
      physicianDiscussionPoints: Array.isArray(parsed.physicianDiscussionPoints) ? parsed.physicianDiscussionPoints : [
        'Request an official fasting plasma glucose or laboratory venous HbA1c test.',
        'Discuss whether an oral glucose tolerance test (OGTT) is warranted.',
        'Review blood pressure tracking over a two-week morning and evening window.'
      ],
      keyLifestylePriorities: Array.isArray(parsed.keyLifestylePriorities) ? parsed.keyLifestylePriorities : [
        'Shift carbohydrate sources to low glycemic index (GI < 55) legumes and whole grains.',
        'Incorporate 150 minutes of weekly moderate aerobic activity with resistance sessions.',
        'Ensure 7–8 hours of uninterrupted sleep to avoid cortisol-mediated dawn glucose spikes.'
      ],
      generatedBy: 'Google Gemini 1.5 Flash (Live Dynamic AI)',
      model: GEMINI_MODEL,
    };
  } catch (err) {
    console.warn('Error parsing Gemini response, using fallback:', err);
    return generateFallbackSynthesis(result);
  }
}

/**
 * Interactive Q&A with Gemini Doctor assistant
 */
export async function askGeminiQuestion(
  result: ScreeningResult,
  question: string,
  history: GeminiMessage[] = [],
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || getGeminiApiKey();

  if (!apiKey) {
    return generateSimulatedChatAnswer(result, question);
  }

  const { input } = result;
  const bmi =
    input.height_cm && input.weight_kg
      ? (input.weight_kg / Math.pow(input.height_cm / 100, 2)).toFixed(1)
      : 'Unspecified';

  const systemContext = `You are "Dr. Gemini", an ADA 2026-aligned clinical endocrinologist assistant embedded in DiabetesRisk Intelligence.
The user is asking a question about their screening evaluation:
Patient Profile:
- Risk Category: ${result.risk_category}
- Health Score: ${result.health_score}/100
- Glucose: ${input.glucose_mg_dl ?? 'Not recorded'} mg/dL (${input.glucose_type})
- Blood Pressure: ${input.sbp ?? 120}/${input.dbp ?? 80} mmHg
- BMI: ${bmi} kg/m²
- Age: ${input.age ?? 'Not recorded'}, Sex: ${input.sex ?? 'Not recorded'}, Family History: ${input.family_history ? 'Yes' : 'No'}

Answer the patient with clinical warmth, extreme clarity, and actionable medical insight. Explain medical mechanisms simply, offer clear guidance, and remind them that this assistant complements their primary care physician. Keep your answer under 160 words.`;

  const contents = [
    { role: 'user', parts: [{ text: systemContext }] },
    { role: 'model', parts: [{ text: 'Understood. I will answer the patient as a warm, authoritative endocrinologist with direct reference to their clinical biomarkers.' }] },
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!res.ok) {
      return generateSimulatedChatAnswer(result, question);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? generateSimulatedChatAnswer(result, question);
  } catch (err) {
    console.error('Gemini chat error:', err);
    return generateSimulatedChatAnswer(result, question);
  }
}

/**
 * Intelligent fallback when API key is not yet configured
 */
function generateFallbackSynthesis(result: ScreeningResult): GeminiClinicalSynthesis {
  const g = result.input.glucose_mg_dl ?? 100;
  const isHigh = result.risk_category === 'high' || result.risk_category === 'very_high';
  const isPrediabetic = result.risk_category === 'medium' || (g >= 100 && g < 126);

  if (isHigh) {
    return {
      summary: `Your biomarkers place you in the elevated risk spectrum (${result.risk_category.replace('_', ' ').toUpperCase()}), primarily influenced by an elevated plasma glucose (${g} mg/dL) and cardiovascular co-factors.`,
      metabolicMechanics: `Sustained elevations in fasting plasma glucose signal significant beta-cell secretory strain combined with reduced hepatic insulin sensitivity. When coupled with systolic blood pressure above optimal thresholds, this accelerates arterial stiffness and microvascular exposure.`,
      physicianDiscussionPoints: [
        'Confirm diagnostic status with formal laboratory venous plasma glucose and HbA1c panel.',
        'Discuss initiation of first-line insulin-sensitizing therapy (e.g. Metformin) alongside lifestyle protocols.',
        'Screen for microalbuminuria and early retinal vascular changes.'
      ],
      keyLifestylePriorities: [
        'Enforce a strict low-glycemic dietary pattern (< 35g net carbs per main meal).',
        'Target 7% total body weight reduction over 24 weeks via a 500 kcal daily deficit.',
        'Execute 150 minutes/week of combined aerobic and resistance exercise.'
      ],
      generatedBy: 'Clinical Reasoning Engine (Configure Gemini API Key in Settings for Live GenAI)',
      model: 'Rule-Calibrated Endocrinology Synthesis',
      isSimulatedFallback: true,
    };
  }

  if (isPrediabetic) {
    return {
      summary: `Your evaluation reveals early impaired fasting glucose (${g} mg/dL), representing the prediabetes transition window where targeted intervention has the highest reversal efficacy.`,
      metabolicMechanics: `In the prediabetic range, muscle and adipose tissues exhibit mild peripheral insulin resistance, while hepatic gluconeogenesis remains mildly dysregulated overnight. The Diabetes Prevention Program (DPP) demonstrates that this stage is up to 58% reversible with structured lifestyle modification.`,
      physicianDiscussionPoints: [
        'Evaluate 2-hour 75g Oral Glucose Tolerance Test (OGTT) to assess postprandial glucose disposal.',
        'Establish a semi-annual biomarker monitoring cadence for HbA1c and lipid particle sizing.',
        'Review nocturnal sleep quality and screen for obstructive sleep apnea if morning glucose remains elevated.'
      ],
      keyLifestylePriorities: [
        'Prioritize prebiotic soluble fibers (chia, flaxseed, oats) to slow glucose absorption velocity.',
        'Take a 10-minute postprandial walk after lunch and dinner to activate non-insulin dependent GLUT4 transporters.',
        'Eliminate all sweetened beverages, refined flours, and high-fructose corn syrups.'
      ],
      generatedBy: 'Clinical Reasoning Engine (Configure Gemini API Key in Settings for Live GenAI)',
      model: 'Rule-Calibrated Endocrinology Synthesis',
      isSimulatedFallback: true,
    };
  }

  return {
    summary: `Your screening indicators reflect a healthy metabolic baseline with well-regulated glucose homeostasis (${g} mg/dL) and low risk progression probability.`,
    metabolicMechanics: `Your beta cells demonstrate preserved first- and second-phase insulin secretion with optimal hepatic insulin clearance. Maintaining this healthy baseline requires preserving lean muscle mass and minimizing chronic visceral inflammation.`,
    physicianDiscussionPoints: [
      'Maintain an annual preventive wellness screening schedule.',
      'Check fasting lipid panel and baseline HbA1c every 12 to 24 months.',
      'Continue home blood pressure monitoring during routine wellness checks.'
    ],
    keyLifestylePriorities: [
      'Maintain balanced Mediterranean nutrition rich in monounsaturated fats (extra virgin olive oil, avocado).',
      'Preserve skeletal muscle mass through progressive resistance training 2–3 times weekly.',
      'Maintain regular hydration (2.5–3 liters daily) and consistent sleep hygiene.'
    ],
    generatedBy: 'Clinical Reasoning Engine (Configure Gemini API Key in Settings for Live GenAI)',
    model: 'Rule-Calibrated Endocrinology Synthesis',
    isSimulatedFallback: true,
  };
}

function generateSimulatedChatAnswer(result: ScreeningResult, question: string): string {
  const q = question.toLowerCase();
  const g = result.input.glucose_mg_dl ?? 100;

  if (q.includes('food') || q.includes('diet') || q.includes('eat') || q.includes('rice') || q.includes('sugar')) {
    return `Based on your glucose of ${g} mg/dL, prioritize high-fiber, low-glycemic index foods (under 55 GI) like steel-cut oats, lentils, non-starchy vegetables, and wild fish. Minimize white rice, refined bread, and sugar-sweetened beverages to prevent postprandial glucose spikes.`;
  }
  if (q.includes('reverse') || q.includes('cure') || q.includes('heal') || q.includes('normal')) {
    return `Yes! Clinical trials (including the landmark ADA DPP trial) prove that early impaired glucose can be reversed in up to 58% of cases through a 5–7% reduction in body weight and 150 minutes of weekly aerobic exercise like brisk walking.`;
  }
  if (q.includes('doctor') || q.includes('physician') || q.includes('test') || q.includes('ask')) {
    return `At your next consultation, ask your physician for a confirmatory venous fasting plasma glucose and laboratory HbA1c test. You may also request an Oral Glucose Tolerance Test (OGTT) to assess how effectively your cells dispose of post-meal carbohydrates.`;
  }
  if (q.includes('bp') || q.includes('blood pressure') || q.includes('hypertension')) {
    return `Your blood pressure (${result.input.sbp ?? 120}/${result.input.dbp ?? 80} mmHg) directly impacts diabetes risk because elevated vascular pressure damages micro-vessels in the kidneys and eyes, amplifying the metabolic stress caused by elevated blood glucose.`;
  }

  return `Based on your overall health score of ${result.health_score}/100 and risk level (${result.risk_category}), maintaining consistent low-glycemic nutrition, 150 minutes of weekly physical activity, and good sleep hygiene will protect your beta-cell function and keep your cardiovascular risk low.`;
}
