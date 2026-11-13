export interface SupabaseScreening {
  id: string;
  patient_id?: string;
  health_score: number;
  risk_category: string;
  created_at: string;
  glucose_mg_dl?: number;
  sbp?: number;
  dbp?: number;
  input_json?: any;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://odhjvhwpfpmdcahzxbcz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaGp2aHdwZnBtZGNhaHp4YmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NDkzMjAsImV4cCI6MjA5NDIyNTMyMH0.9__Beog44XI_mPTKdBpSveax8bMfuvNhk3sRy-VZjI0';

export async function saveScreeningToSupabase(record: SupabaseScreening): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/screenings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Supabase Sync] fallback to local:', err);
    return false;
  }
}

export async function fetchScreeningsFromSupabase(): Promise<SupabaseScreening[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/screenings?select=*&order=created_at.desc&limit=50`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveDoctorToSupabase(doctor: { id: string; name: string; specialization: string; hospital: string; password?: string }): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/doctors`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        created_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
