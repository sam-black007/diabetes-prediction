export interface MonitoredPatient {
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F';
  added_at: string;
  health_score: number;
  glucose_mg_dl: number;
  sbp: number;
  dbp: number;
  risk_category: 'low' | 'medium' | 'high' | 'very_high';
  clinical_notes?: string;
}

const DOCTOR_PATIENTS_KEY = 'dri_doctor_monitored_patients';

const INITIAL_ROSTER: MonitoredPatient[] = [
  {
    id: 'DRI-PT-80562',
    name: 'Ramesh Patel',
    age: 52,
    sex: 'M',
    added_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    health_score: 72,
    glucose_mg_dl: 118,
    sbp: 128,
    dbp: 82,
    risk_category: 'medium',
    clinical_notes: 'Post-prandial follow-up. Transitioning from white rice to foxtail millet.',
  },
  {
    id: 'DRI-PT-49210',
    name: 'Ananya Sharma',
    age: 44,
    sex: 'F',
    added_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    health_score: 88,
    glucose_mg_dl: 94,
    sbp: 116,
    dbp: 74,
    risk_category: 'low',
    clinical_notes: 'Optimal glycemic control maintained with daily 100-step Shatapadi walk.',
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
    added_at: new Date().toISOString(),
    health_score: score,
    glucose_mg_dl: glucose,
    sbp,
    dbp,
    risk_category: score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high',
    clinical_notes: notes || 'Monitored via Physician Clinical Registry.',
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
