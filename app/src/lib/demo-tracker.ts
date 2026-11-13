'use client';

const MAX_DEMO_TRIALS = 5;
const DEMO_TRIALS_KEY = 'dri_demo_trials_count';

export function getDemoTrialsUsed(): number {
  if (typeof window === 'undefined') return 0;
  const count = parseInt(localStorage.getItem(DEMO_TRIALS_KEY) || '0', 10);
  return isNaN(count) ? 0 : count;
}

export function getDemoTrialsRemaining(): number {
  return Math.max(0, MAX_DEMO_TRIALS - getDemoTrialsUsed());
}

export function canRunDemoTrial(): boolean {
  return getDemoTrialsRemaining() > 0;
}

export function recordDemoTrial(): { used: number; remaining: number; allowed: boolean } {
  if (typeof window === 'undefined') return { used: 1, remaining: 4, allowed: true };
  const current = getDemoTrialsUsed();
  if (current >= MAX_DEMO_TRIALS) {
    return { used: current, remaining: 0, allowed: false };
  }
  const next = current + 1;
  localStorage.setItem(DEMO_TRIALS_KEY, next.toString());
  
  // Also track in total demo simulations for admin telemetry
  const total = parseInt(localStorage.getItem('dri_admin_total_demo_runs') || '38', 10);
  localStorage.setItem('dri_admin_total_demo_runs', (total + 1).toString());
  
  window.dispatchEvent(new Event('dri_demo_trial_recorded'));
  return { used: next, remaining: Math.max(0, MAX_DEMO_TRIALS - next), allowed: true };
}

export function resetDemoTrials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_TRIALS_KEY);
  window.dispatchEvent(new Event('dri_demo_trial_recorded'));
}
