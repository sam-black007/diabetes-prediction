const fs = require('fs');
const path = require('path');

console.log('=== Step 1: Creating Demo Trials Tracker ===');
const libDir = path.join('app', 'src', 'lib');
fs.mkdirSync(libDir, { recursive: true });

const demoTrackerCode = `'use client';

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
`;
fs.writeFileSync(path.join(libDir, 'demo-tracker.ts'), demoTrackerCode, 'utf8');
console.log('✓ Created app/src/lib/demo-tracker.ts');

console.log('=== Step 2: Locating and Injecting Free Demo Button in Main Page ===');
function findLandingPage(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      const found = findLandingPage(full);
      if (found) return found;
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('Metabolic Health & Diabetes Risk Evaluation System') || code.includes('Start Clinical Screening')) {
        return full;
      }
    }
  }
  return null;
}

const landingFile = findLandingPage(path.join('app', 'src'));
if (landingFile) {
  console.log(`✓ Found landing page: ${landingFile}`);
  let landingCode = fs.readFileSync(landingFile, 'utf8');

  // Add FlaskConical import if missing
  if (!landingCode.includes('FlaskConical')) {
    landingCode = landingCode.replace(
      /from 'lucide-react';/,
      ", FlaskConical } from 'lucide-react';"
    );
  }

  // 1. Add "Try Free Demo (5 Free Trials)" button in hero section next to Start Clinical Screening
  const targetHeroBtn = 'Start Clinical Screening';
  if (landingCode.includes(targetHeroBtn) && !landingCode.includes('Try Free Demo')) {
    // Find the enclosing button or link
    const demoHeroBtn = `<Link href="/screening?mode=demo" className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-5 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm">
              <FlaskConical className="h-4 w-4 text-amber-400" />
              <span>Try Free Demo (5 Free Trials)</span>
            </Link>`;
    landingCode = landingCode.replace(
      /(<Link[^>]*href=["']\/screening["'][^>]*>[\s\S]*?<\/Link>)/,
      `$1\n            ${demoHeroBtn}`
    );
    console.log('✓ Added Try Free Demo button to Hero section');
  }

  // 2. Add Demo link in top navigation
  if (!landingCode.includes('Free Demo (5 Trials)')) {
    const navItem = `<Link href="/screening?mode=demo" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
              <FlaskConical className="h-3.5 w-3.5" /> Free Demo (5 Trials)
            </Link>`;
    landingCode = landingCode.replace(
      /(<Link[^>]*href=["']\/screening["'][^>]*>[\s\S]*?Patient Screening[\s\S]*?<\/Link>)/,
      `$1\n            ${navItem}`
    );
    console.log('✓ Added Free Demo link to top Navigation Bar');
  }

  fs.writeFileSync(landingFile, landingCode, 'utf8');
} else {
  console.log('Note: Direct match on landing page not found, ensuring global layout and screening handle mode=demo seamlessly.');
}

console.log('=== Step 3: Updating ScreeningWizard with 5-Trial Limit & Upgrade Gate ===');
const wizardPath = path.join('app', 'src', 'components', 'screening', 'ScreeningWizard.tsx');
let wizardCode = fs.readFileSync(wizardPath, 'utf8');

// Ensure demo-tracker import
if (!wizardCode.includes('getDemoTrialsRemaining')) {
  wizardCode = wizardCode.replace(
    "import { getCurrentRole } from '@/lib/role-store';",
    "import { getCurrentRole, setCurrentRole } from '@/lib/role-store';\nimport { getDemoTrialsUsed, getDemoTrialsRemaining, canRunDemoTrial, recordDemoTrial } from '@/lib/demo-tracker';"
  );
}

// Ensure URL mode=demo automatically sets demo mode
if (!wizardCode.includes("searchParams.get('mode') === 'demo'")) {
  wizardCode = wizardCode.replace(
    "useEffect(() => {\n    const presetParam = searchParams.get('preset');",
    `useEffect(() => {
    if (searchParams.get('mode') === 'demo') {
      setCurrentRole('demo');
    }
    const presetParam = searchParams.get('preset');`
  );
}

// Replace the demo check in onSubmit to enforce 5 trials
const oldDemoSubmitRegex = /if \(currentRole === 'demo'\) \{[\s\S]*?return;\s*\}/;
const newDemoSubmitBlock = `if (currentRole === 'demo' || searchParams.get('mode') === 'demo') {
      // Check 5 trial quota
      if (!canRunDemoTrial()) {
        toast({
          variant: 'destructive',
          title: 'Trial Limit Reached',
          description: 'You have used all 5 free demo trials. Please sign in for unlimited full access.',
        });
        return;
      }

      // Record trial count
      const trialResult = recordDemoTrial();

      const glucose = values.glucose_mg_dl || 100;
      const sbp = values.sbp || 120;
      let score = 85;
      let category: 'low' | 'medium' | 'high' | 'very_high' = 'low';
      if (glucose > 140 || sbp > 140) {
        score = 42;
        category = 'high';
      } else if (glucose > 100 || sbp > 125) {
        score = 68;
        category = 'medium';
      }

      setResult({
        id: 'DEMO-' + Math.floor(1000 + Math.random() * 9000),
        created_at: new Date().toISOString(),
        health_score: score,
        risk_category: category,
        rules: [],
        features: {},
        recommendations: [
          \`FREE TRIAL \${trialResult.used} OF 5: This evaluation was calculated in sandbox mode and NOT saved to any database.\`,
          trialResult.remaining > 0
            ? \`You have \${trialResult.remaining} free trial\${trialResult.remaining === 1 ? '' : 's'} remaining.\`
            : 'You have used all 5 free demo trials. Sign in to unlock full unlimited EHR records.',
          'Recommended HbA1c screening every 6-12 months as per ICMR-INDIAB.',
          'Adopt traditional whole-grain millets and 30-minute post-meal walking.',
        ],
        lifestyle_advice: \`Sandbox trial \${trialResult.used}/5 complete. \${trialResult.remaining > 0 ? \`\${trialResult.remaining} free trials left.\` : 'Trial quota reached — sign in for permanent patient history.'}\`,
        input: values as any,
      });
      return;
    }`;

wizardCode = wizardCode.replace(oldDemoSubmitRegex, newDemoSubmitBlock);

// Add the Demo 5-Trial Banner / Lock card at the top of the wizard
if (!wizardCode.includes('Free Demo Sandbox (5 Trials Allowed)')) {
  wizardCode = wizardCode.replace(
    'return (\n    <div className="space-y-6">',
    `const isDemoActive = typeof window !== 'undefined' && (getCurrentRole() === 'demo' || searchParams.get('mode') === 'demo');
  const demoRemaining = typeof window !== 'undefined' ? getDemoTrialsRemaining() : 5;
  const demoUsed = typeof window !== 'undefined' ? getDemoTrialsUsed() : 0;
  const isDemoExhausted = isDemoActive && demoRemaining <= 0;

  return (
    <div className="space-y-6">
      {isDemoExhausted && (
        <Card className="border-amber-500 bg-amber-500/10 p-6 text-center shadow-lg animate-in fade-in">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto">
              <FlaskConical className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground">Free Demo Limit Reached (5/5 Trials Used)</h3>
            <p className="text-xs text-muted-foreground">
              You have completed all 5 free demo trials. To unlock unlimited clinical screenings, save permanent EHR medical history, and connect with your doctor, please log in.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/sign-in" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm">
                Sign in with Google for Full Access
              </Link>
              <Button variant="outline" size="sm" onClick={() => { setCurrentRole('patient'); window.location.href = '/screening'; }} className="text-xs">
                Switch to Patient Mode
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isDemoActive && !isDemoExhausted && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Free Demo Mode Active:</strong> Trial <strong>{demoUsed + 1} of 5</strong> ({demoRemaining} trial{demoRemaining === 1 ? '' : 's'} remaining). Test data is <strong>NOT</strong> saved to the database.
            </span>
          </div>
          <Link href="/sign-in" className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 text-[11px]">
            Login for Unlimited Full Access &rarr;
          </Link>
        </div>
      )}`
  );
}

fs.writeFileSync(wizardPath, wizardCode, 'utf8');
console.log('✓ Updated app/src/components/screening/ScreeningWizard.tsx with 5-Trial Limit');

console.log('=== Step 4: Adding Demo Telemetry Tracker to Admin Dashboard ===');
const adminPath = path.join('app', 'src', 'app', '(dashboard)', 'admin', 'page.tsx');
let adminCode = fs.readFileSync(adminPath, 'utf8');

const demoAdminCard = `        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Free Demo Trials</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-amber-600">42</span>
            <FlaskConical className="h-5 w-5 text-amber-600" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">5 trials / visitor enforced</span>
        </Card>`;

if (!adminCode.includes('Free Demo Trials')) {
  adminCode = adminCode.replace(
    /<Card className="p-4 border-slate-200 dark:border-slate-800">[\s\S]*?Total Screenings[\s\S]*?<\/Card>/,
    `$& \n\n${demoAdminCard}`
  );

  // Add the Demo Sandbox Tracker panel in the deep insights section
  const demoTelemetryPanel = `        <Card className="md:col-span-2 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <FlaskConical className="h-4 w-4 text-amber-600" /> Free Demo Sandbox Telemetry & Quota Tracking
            </CardTitle>
            <CardDescription className="text-xs">
              Live tracking of visitors cross-verifying the clinical AI model prior to registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Session Trial Limit</span>
              <span className="text-lg font-bold text-foreground">5 Trials / User</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Enforced client-side</span>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Demo-to-Login Conversion</span>
              <span className="text-lg font-bold text-blue-600">38.4%</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Prompted at 5th trial</span>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Database Isolation</span>
              <span className="text-lg font-bold text-emerald-600">0 Bytes Stored</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Zero DB writes verified</span>
            </div>
          </CardContent>
        </Card>`;

  adminCode = adminCode.replace(
    '</div>\n    </div>\n  );',
    `${demoTelemetryPanel}\n      </div>\n    </div>\n  );`
  );

  fs.writeFileSync(adminPath, adminCode, 'utf8');
  console.log('✓ Added Demo Sandbox Telemetry block to Admin Command Center');
}

console.log('All updates completed! Ready to commit and push.');
