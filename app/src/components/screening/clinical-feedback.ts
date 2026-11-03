import type { ScreeningFormValues } from '@/lib/validation/screening';

export function getGlucoseFeedback(value?: number, type: string = 'fasting') {
  if (value == null || isNaN(value)) return null;

  if (type === 'hba1c') {
    if (value < 5.7) {
      return { status: 'optimal', label: 'Normal HbA1c (< 5.7%)', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (value <= 6.4) {
      return { status: 'warning', label: 'Prediabetes Range (5.7% – 6.4%)', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
    }
    return { status: 'alert', label: 'Diabetic Threshold (≥ 6.5%)', color: 'text-red-600 bg-red-500/10 border-red-500/20' };
  }

  // mg/dL fasting
  if (value < 70) {
    return { status: 'warning', label: 'Hypoglycemia Alert (< 70 mg/dL)', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
  }
  if (value < 100) {
    return { status: 'optimal', label: 'Optimal Fasting Glucose (70 – 99 mg/dL)', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (value <= 125) {
    return { status: 'warning', label: 'Impaired Fasting Glucose / Prediabetes (100 – 125 mg/dL)', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
  }
  return { status: 'alert', label: 'Diabetic Threshold (≥ 126 mg/dL)', color: 'text-red-600 bg-red-500/10 border-red-500/20' };
}

export function getBmiFeedback(heightCm?: number, weightKg?: number) {
  if (!heightCm || !weightKg || heightCm < 50 || weightKg < 20) return null;
  const hM = heightCm / 100;
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));

  if (bmi < 18.5) {
    return { bmi, label: `BMI: ${bmi} · Underweight (< 18.5)`, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' };
  }
  if (bmi <= 24.9) {
    return { bmi, label: `BMI: ${bmi} · Healthy Weight (18.5 – 24.9)`, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (bmi <= 29.9) {
    return { bmi, label: `BMI: ${bmi} · Overweight (25.0 – 29.9)`, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
  }
  return { bmi, label: `BMI: ${bmi} · Obese (≥ 30.0)`, color: 'text-red-600 bg-red-500/10 border-red-500/20' };
}

export function getBpFeedback(sbp?: number, dbp?: number) {
  if (!sbp && !dbp) return null;
  const s = sbp ?? 120;
  const d = dbp ?? 80;

  if (s < 120 && d < 80) {
    return { label: `BP: ${s}/${d} mmHg · Normal (< 120/80)`, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (s <= 129 && d < 80) {
    return { label: `BP: ${s}/${d} mmHg · Elevated SBP (120–129)`, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' };
  }
  if (s <= 139 || d <= 89) {
    return { label: `BP: ${s}/${d} mmHg · Stage 1 Hypertension`, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' };
  }
  return { label: `BP: ${s}/${d} mmHg · Stage 2 Hypertension (≥ 140/90)`, color: 'text-red-600 bg-red-500/10 border-red-500/20' };
}
