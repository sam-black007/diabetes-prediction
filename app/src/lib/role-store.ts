'use client';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'demo';

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  password?: string;
}

const DEFAULT_DOCTOR: DoctorProfile = {
  id: 'DR-88219',
  name: 'Dr. Priya Nair, MD',
  specialization: 'Consultant Clinical Diabetologist & RSSDI Fellow',
  hospital: 'All-India Institute of Diabetes Care',
};

export function getCurrentRole(): UserRole {
  if (typeof window === 'undefined') return 'patient';
  return (localStorage.getItem('dri_user_role') as UserRole) || 'patient';
}

export function setCurrentRole(role: UserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dri_user_role', role);
  window.dispatchEvent(new Event('dri_role_changed'));
}

export function verifyAdminPassword(pass: string): boolean {
  return pass === 'admin@dri2026' || pass === 'admin123';
}

export function getDoctorProfile(): DoctorProfile {
  if (typeof window === 'undefined') return DEFAULT_DOCTOR;
  const raw = localStorage.getItem('dri_doctor_profile');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return DEFAULT_DOCTOR;
}

export function saveDoctorProfile(profile: DoctorProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dri_doctor_profile', JSON.stringify(profile));
  window.dispatchEvent(new Event('dri_doctor_profile_changed'));
}
