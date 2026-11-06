export type ActivityLevel = 'vigorous' | 'moderate' | 'sedentary';
export type FastingFestivalType = 'none' | 'navratri_vrat' | 'ramadan' | 'diwali_sweets';

export interface IDRSInput {
  age: number;
  waistCm?: number;
  sex?: 'M' | 'F';
  activity: ActivityLevel;
  familyHistoryDiabeticParents: 0 | 1 | 2;
}

export interface IDRSResult {
  score: number;
  category: 'Low' | 'Moderate' | 'High';
  color: string;
  recommendation: string;
}

export function calculateIDRS(input: IDRSInput): IDRSResult {
  let score = 0;
  if (input.age >= 50) score += 30;
  else if (input.age >= 35) score += 20;

  const isFemale = input.sex === 'F';
  const waist = input.waistCm ?? (isFemale ? 82 : 88);
  if (isFemale) {
    if (waist >= 90) score += 20;
    else if (waist >= 80) score += 10;
  } else {
    if (waist >= 90) score += 20;
    else if (waist >= 85) score += 10;
  }

  if (input.activity === 'sedentary') score += 30;
  else if (input.activity === 'moderate') score += 20;

  if (input.familyHistoryDiabeticParents === 2) score += 20;
  else if (input.familyHistoryDiabeticParents === 1) score += 10;

  if (score >= 60) {
    return {
      score,
      category: 'High',
      color: 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10',
      recommendation: 'Immediate fasting blood sugar and venous HbA1c confirmatory test strongly advised.',
    };
  } else if (score >= 30) {
    return {
      score,
      category: 'Moderate',
      color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
      recommendation: 'Annual screening recommended; initiate lifestyle and dietary modifications.',
    };
  }
  return {
    score,
    category: 'Low',
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    recommendation: 'Optimal baseline. Maintain regular physical activity and rescreen in 3 years.',
  };
}

export function calculateTgHdlRatio(triglycerides?: number, hdl?: number): {
  ratio?: number;
  status: 'Optimal' | 'Borderline' | 'Atherogenic Risk' | 'Unknown';
  clinicalInterpretation: string;
} {
  if (!triglycerides || !hdl || hdl <= 0) {
    return {
      status: 'Unknown',
      clinicalInterpretation: 'Lipid panel incomplete. Enter both Serum Triglycerides and HDL.',
    };
  }
  const ratio = parseFloat((triglycerides / hdl).toFixed(2));
  if (ratio >= 3.0) {
    return {
      ratio,
      status: 'Atherogenic Risk',
      clinicalInterpretation: 'High presence of small dense LDL (sdLDL) and visceral insulin resistance specific to the South Asian phenotype.',
    };
  } else if (ratio >= 2.0) {
    return {
      ratio,
      status: 'Borderline',
      clinicalInterpretation: 'Mild lipid atherogenicity. Prioritize cutting refined carbohydrate intake.',
    };
  }
  return {
    ratio,
    status: 'Optimal',
    clinicalInterpretation: 'Favorable triglyceride-to-HDL balance with robust metabolic flexibility.',
  };
}

export function getAsianIndianBmiCategory(bmi: number): { category: string; color: string } {
  if (bmi < 18.0) return { category: 'Underweight', color: 'text-blue-500' };
  if (bmi <= 22.9) return { category: 'Normal (Asian-Indian Target)', color: 'text-emerald-500' };
  if (bmi <= 24.9) return { category: 'Overweight (ICMR Cutoff ≥ 23)', color: 'text-amber-500' };
  return { category: 'Obese (ICMR Cutoff ≥ 25)', color: 'text-red-500' };
}
