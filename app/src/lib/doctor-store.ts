export interface MonitoredPatient {
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F';
  diagnosis: string;
  status: 'critical' | 'monitoring' | 'improving';
  health_score: number;
  ai_risk_score: number;
  glucose_mg_dl: number;
  glucose_pp_mg_dl: number;
  sbp: number;
  dbp: number;
  heart_rate_bpm: number;
  hba1c: number;
  bmi: number;
  idrs_score: number;
  tg_hdl_ratio: number;
  risk_category: 'low' | 'medium' | 'high' | 'very_high';
  clinical_notes: string;
  updated_at: string;
  added_at: string;
}

const DOCTOR_PATIENTS_KEY = 'dri_doctor_monitored_patients';

const INITIAL_ROSTER: MonitoredPatient[] = [
  {
    id: '#P-00412',
    name: 'Marcus Vance',
    age: 58,
    sex: 'M',
    diagnosis: 'T2D Severe Hyperglycemia & Atrial Fibrillation',
    status: 'critical',
    health_score: 48,
    ai_risk_score: 91,
    glucose_mg_dl: 218,
    glucose_pp_mg_dl: 284,
    sbp: 148,
    dbp: 94,
    heart_rate_bpm: 112,
    hba1c: 9.4,
    bmi: 29.2,
    idrs_score: 85,
    tg_hdl_ratio: 5.4,
    risk_category: 'very_high',
    clinical_notes: 'Glycemic spike detected after high-carbohydrate meal. Needs immediate insulin titration and ECG monitoring.',
    updated_at: '2 min ago',
    added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '#P-00308',
    name: 'Roberto Gomez',
    age: 62,
    sex: 'M',
    diagnosis: 'Hypertensive Cardiometabolic Crisis',
    status: 'monitoring',
    health_score: 62,
    ai_risk_score: 76,
    glucose_mg_dl: 162,
    glucose_pp_mg_dl: 210,
    sbp: 158,
    dbp: 92,
    heart_rate_bpm: 88,
    hba1c: 7.9,
    bmi: 27.6,
    idrs_score: 70,
    tg_hdl_ratio: 4.2,
    risk_category: 'high',
    clinical_notes: 'Isolated systolic hypertension. Prescribed Shatapadi 100-step walking and sodium restriction to <2g/day.',
    updated_at: '1 hr ago',
    added_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '#P-00219',
    name: 'Amara Okafor',
    age: 46,
    sex: 'F',
    diagnosis: 'Impaired Fasting Glucose & Dyslipidemia',
    status: 'improving',
    health_score: 82,
    ai_risk_score: 58,
    glucose_mg_dl: 104,
    glucose_pp_mg_dl: 142,
    sbp: 132,
    dbp: 82,
    heart_rate_bpm: 76,
    hba1c: 6.2,
    bmi: 24.1,
    idrs_score: 45,
    tg_hdl_ratio: 2.8,
    risk_category: 'medium',
    clinical_notes: 'Positive glycemic stabilization following barnyard millet dietary substitution.',
    updated_at: '20 min ago',
    added_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'DRI-PT-80562',
    name: 'Ramesh Patel',
    age: 52,
    sex: 'M',
    diagnosis: 'Type 2 Diabetes (Under Stabilization)',
    status: 'monitoring',
    health_score: 74,
    ai_risk_score: 64,
    glucose_mg_dl: 118,
    glucose_pp_mg_dl: 156,
    sbp: 128,
    dbp: 82,
    heart_rate_bpm: 80,
    hba1c: 6.8,
    bmi: 25.8,
    idrs_score: 60,
    tg_hdl_ratio: 3.4,
    risk_category: 'medium',
    clinical_notes: 'South Asian phenotype monitoring. Postprandial glucose excursion under control.',
    updated_at: '35 min ago',
    added_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'DRI-PT-49210',
    name: 'Ananya Sharma',
    age: 39,
    sex: 'F',
    diagnosis: 'Homeostatic Metabolic Profile',
    status: 'improving',
    health_score: 92,
    ai_risk_score: 22,
    glucose_mg_dl: 92,
    glucose_pp_mg_dl: 118,
    sbp: 116,
    dbp: 74,
    heart_rate_bpm: 72,
    hba1c: 5.4,
    bmi: 21.8,
    idrs_score: 20,
    tg_hdl_ratio: 1.8,
    risk_category: 'low',
    clinical_notes: 'Optimal metabolic health maintained. Annual screening recommended.',
    updated_at: '3 hr ago',
    added_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
];

export function listMonitoredPatients(): MonitoredPatient[] {
  if (typeof window === 'undefined') return INITIAL_ROSTER;
  try {
    const raw = localStorage.getItem(DOCTOR_PATIENTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_ROSTER;
  } catch {
    return INITIAL_ROSTER;
  }
}

export function addMonitoredPatient(patientId: string, name?: string, notes?: string): MonitoredPatient {
  const current = listMonitoredPatients();
  const existing = current.find((p) => p.id.toUpperCase() === patientId.trim().toUpperCase());
  if (existing) return existing;

  const score = Math.floor(55 + Math.random() * 35);
  const glucose = Math.round(180 - score * 0.9);
  const sbp = Math.round(150 - score * 0.35);
  const dbp = Math.round(95 - score * 0.2);

  const newPatient: MonitoredPatient = {
    id: patientId.trim().toUpperCase(),
    name: name?.trim() || `Patient ${patientId.trim().toUpperCase()}`,
    age: Math.floor(35 + Math.random() * 30),
    sex: Math.random() > 0.5 ? 'M' : 'F',
    diagnosis: 'Metabolic Evaluation Pending',
    status: score >= 80 ? 'improving' : score >= 60 ? 'monitoring' : 'critical',
    health_score: score,
    ai_risk_score: Math.max(15, 100 - score),
    glucose_mg_dl: glucose,
    glucose_pp_mg_dl: Math.round(glucose * 1.35),
    sbp,
    dbp,
    heart_rate_bpm: Math.round(72 + Math.random() * 20),
    hba1c: Number((5.5 + (glucose - 90) * 0.03).toFixed(1)),
    bmi: Number((22 + Math.random() * 6).toFixed(1)),
    idrs_score: Math.round(40 + Math.random() * 40),
    tg_hdl_ratio: Number((2.0 + Math.random() * 3).toFixed(1)),
    risk_category: score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high',
    clinical_notes: notes || 'Monitored via Physician Clinical Registry.',
    updated_at: 'Just now',
    added_at: new Date().toISOString(),
  };

  current.unshift(newPatient);
  if (typeof window !== 'undefined') {
    localStorage.setItem(DOCTOR_PATIENTS_KEY, JSON.stringify(current));
  }
  return newPatient;
}

export function removeMonitoredPatient(patientId: string): void {
  if (typeof window === 'undefined') return;
  const filtered = listMonitoredPatients().filter((p) => p.id !== patientId);
  localStorage.setItem(DOCTOR_PATIENTS_KEY, JSON.stringify(filtered));
}
