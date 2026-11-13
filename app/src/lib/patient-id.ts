export function getMyPatientId(): string {
  if (typeof window === 'undefined') return 'DRI-PT-80562';
  const existing = localStorage.getItem('dri_my_patient_id');
  if (existing) return existing;
  const num = Math.floor(10000 + Math.random() * 90000);
  const newId = `DRI-PT-${num}`;
  localStorage.setItem('dri_my_patient_id', newId);
  return newId;
}
