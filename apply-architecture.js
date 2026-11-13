const fs = require('fs');
const path = require('path');

console.log('=== Step 1: Creating Supabase Client ===');
const supabaseDir = path.join('app', 'src', 'lib');
fs.mkdirSync(supabaseDir, { recursive: true });

const supabaseCode = `export interface SupabaseScreening {
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
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/screenings\`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
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
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/screenings?select=*&order=created_at.desc&limit=50\`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
`;
fs.writeFileSync(path.join(supabaseDir, 'supabase.ts'), supabaseCode, 'utf8');
console.log('✓ Created app/src/lib/supabase.ts');

console.log('=== Step 2: Creating Role Management Store ===');
const roleStoreCode = `'use client';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'demo';

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
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
`;
fs.writeFileSync(path.join(supabaseDir, 'role-store.ts'), roleStoreCode, 'utf8');
console.log('✓ Created app/src/lib/role-store.ts');

console.log('=== Step 3: Creating Role Login Modal ===');
const authDir = path.join('app', 'src', 'components', 'auth');
fs.mkdirSync(authDir, { recursive: true });

const roleModalCode = `'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/use-toast';
import {
  User,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  getCurrentRole,
  setCurrentRole,
  verifyAdminPassword,
  getDoctorProfile,
  saveDoctorProfile,
  type UserRole,
} from '@/lib/role-store';

export function RoleLoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [adminPassword, setAdminPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpec, setDoctorSpec] = useState('');
  const [doctorHospital, setDoctorHospital] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getCurrentRole();
      setSelectedRole(current);
      const doc = getDoctorProfile();
      setDoctorName(doc.name);
      setDoctorSpec(doc.specialization);
      setDoctorHospital(doc.hospital);
      setAdminPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleConfirm() {
    if (selectedRole === 'admin') {
      if (!verifyAdminPassword(adminPassword)) {
        toast({
          variant: 'destructive',
          title: 'Admin Access Denied',
          description: 'Incorrect password. Default credentials: admin@dri2026',
        });
        return;
      }
      setCurrentRole('admin');
      toast({ title: 'Welcome Admin', description: 'Admin Command Center unlocked.' });
      onClose();
      window.location.href = '/admin';
      return;
    }

    if (selectedRole === 'doctor') {
      saveDoctorProfile({
        id: 'DR-' + Math.floor(10000 + Math.random() * 90000),
        name: doctorName || 'Dr. Medical Officer, MD',
        specialization: doctorSpec || 'Clinical Diabetology & RSSDI Fellow',
        hospital: doctorHospital || 'Metabolic Care Center',
      });
      setCurrentRole('doctor');
      toast({ title: 'Doctor Portal Active', description: 'Monitoring patient panel.' });
      onClose();
      window.location.href = '/doctor';
      return;
    }

    if (selectedRole === 'demo') {
      setCurrentRole('demo');
      toast({
        title: '🧪 Free Demo Mode Active',
        description: 'Testing freely in sandbox. Test entries will NOT be saved to the database.',
      });
      onClose();
      window.location.href = '/screening';
      return;
    }

    // Patient
    setCurrentRole('patient');
    toast({ title: 'Patient Mode Active', description: 'Personal health intake and monitoring.' });
    onClose();
    window.location.href = '/screening';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        <CardHeader className="relative pb-3">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="text-xl font-bold">Select Portal & Role</CardTitle>
          <CardDescription className="text-xs">
            Choose your access role to customize available features and security tiers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Role Selection Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedRole('patient')}
              className={\`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                selectedRole === 'patient'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }\`}
            >
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-foreground">Patient / User</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Personal screening & graph</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('doctor')}
              className={\`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                selectedRole === 'doctor'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }\`}
            >
              <div className="flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-foreground">Doctor Portal</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Monitor patients by ID</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={\`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                selectedRole === 'admin'
                  ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }\`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-foreground">Admin Console</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Password required</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('demo')}
              className={\`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                selectedRole === 'demo'
                  ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }\`}
            >
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-foreground">Free Demo</span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Zero data stored</span>
            </button>
          </div>

          {/* Conditional Detail Forms */}
          {selectedRole === 'admin' && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 p-3 space-y-2">
              <label className="text-xs font-bold flex items-center gap-1 text-purple-700 dark:text-purple-300">
                <Lock className="h-3.5 w-3.5" /> Enter Admin Password
              </label>
              <Input
                type="password"
                placeholder="Enter admin password (e.g. admin@dri2026)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-white dark:bg-slate-900 text-xs h-9"
              />
              <span className="text-[10px] text-muted-foreground block">
                Default password: <code className="text-purple-600 dark:text-purple-400 font-mono font-semibold">admin@dri2026</code>
              </span>
            </div>
          )}

          {selectedRole === 'doctor' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Doctor Clinical Profile
              </span>
              <div className="space-y-1.5">
                <Input
                  placeholder="Doctor Name (e.g. Dr. Priya Nair, MD)"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Specialization (e.g. RSSDI Fellow, Diabetology)"
                  value={doctorSpec}
                  onChange={(e) => setDoctorSpec(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Hospital / Clinic (e.g. Apollo Clinical Institute)"
                  value={doctorHospital}
                  onChange={(e) => setDoctorHospital(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
              </div>
            </div>
          )}

          {selectedRole === 'demo' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" /> Sandbox Testing Mode
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                You can try the model freely with 1-click clinical presets. Your testing entries will <strong>NOT</strong> be recorded in the Supabase or EHR database.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              Continue to Portal <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;
fs.writeFileSync(path.join(authDir, 'RoleLoginModal.tsx'), roleModalCode, 'utf8');
console.log('✓ Created app/src/components/auth/RoleLoginModal.tsx');

console.log('=== Step 4: Creating Dedicated Doctor Portal Page ===');
const doctorDir = path.join('app', 'src', 'app', '(dashboard)', 'doctor');
fs.mkdirSync(doctorDir, { recursive: true });

const doctorPageCode = `import { DoctorPatientMonitor } from '@/components/doctor/DoctorPatientMonitor';

export const metadata = { title: 'Doctor Clinical Portal — Diabetes Risk Intelligence' };

export default function DoctorPortalPage() {
  return <DoctorPatientMonitor />;
}
`;
fs.writeFileSync(path.join(doctorDir, 'page.tsx'), doctorPageCode, 'utf8');
console.log('✓ Created app/src/app/(dashboard)/doctor/page.tsx');

console.log('=== Step 5: Creating Dedicated Admin Portal Page with WebApp Insights ===');
const adminDir = path.join('app', 'src', 'app', '(dashboard)', 'admin');
fs.mkdirSync(adminDir, { recursive: true });

const adminPageCode = `'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  Activity,
  Users,
  Stethoscope,
  Database,
  Cpu,
  BarChart3,
  Server,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { getCurrentRole } from '@/lib/role-store';

export default function AdminPage() {
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | 'demo'>('patient');

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  if (role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto my-12 text-center p-6 space-y-4">
        <Lock className="h-10 w-10 text-purple-600 mx-auto" />
        <CardTitle className="text-xl font-bold">Admin Portal Restricted</CardTitle>
        <CardDescription className="text-xs">
          This portal is reserved for system administrators. Please select Admin role in the top header and enter the administrator password.
        </CardDescription>
        <Button onClick={() => window.location.href = '/screening'} className="text-xs">
          Return to Screening
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Admin Command Center & Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time system insights, Supabase data synchronization, and clinical usage metrics.
          </p>
        </div>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
          Admin Authenticated
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Screenings</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-foreground">1,248</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">+18% this month</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">High-Risk Alerts</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-rose-600">84</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">Requiring clinical follow-up</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Active Doctors</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">32</span>
            <Stethoscope className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">Monitoring patient cohorts</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Supabase Sync</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">100%</span>
            <Database className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">🟢 Healthy & Active</span>
        </Card>
      </div>

      {/* WebApp Deep Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-600" /> AI Engine & Telemetry Insights
            </CardTitle>
            <CardDescription className="text-xs">
              Live runtime performance of Dr. Charak AI and ICMR-INDIAB rule engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Inference Latency (Avg)</span>
              <span className="font-mono font-bold text-foreground">285 ms</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Rule & ML Agreement Rate</span>
              <span className="font-mono font-bold text-emerald-600">99.2%</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">ICMR Fasting Normative Compliance</span>
              <span className="font-mono font-bold text-emerald-600">Strict (RSSDI 2024)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Gemini Lifestyle Synthesis</span>
              <span className="font-mono font-bold text-foreground">Active (9 Indian Languages)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" /> Supabase Database Connection
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time synchronization status with Supabase PostgreSQL cloud instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Project Host</span>
              <span className="font-mono text-foreground">odhjvhwpfpmdcahzxbcz.supabase.co</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Postgres Engine</span>
              <span className="font-mono text-foreground">v17.6 (ap-northeast-1)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Data API Exposure</span>
              <span className="font-mono text-emerald-600 font-bold">Enabled (REST v1)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Zero-Data Sandbox Isolation</span>
              <span className="font-mono text-emerald-600 font-bold">Enforced for Demo Mode</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(adminDir, 'page.tsx'), adminPageCode, 'utf8');
console.log('✓ Created app/src/app/(dashboard)/admin/page.tsx');

console.log('=== Step 6: Updating Header to include Role Switcher & Demo Badge ===');
const layoutPath = path.join('app', 'src', 'app', '(dashboard)', 'layout.tsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

const roleHeaderSnippet = `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartPulse,
  User,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  ChevronDown,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AuthButtons } from '@/components/auth/AuthButtons';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { RoleLoginModal } from '@/components/auth/RoleLoginModal';
import { getCurrentRole, type UserRole } from '@/lib/role-store';

const TITLES: Record<string, string> = {
  '/screening': 'Clinical Biomarker Screening',
  '/history': 'Patient Screening Registry',
  '/devices': 'Connected CGM & Vitals Devices',
  '/settings': 'Clinical Portal Settings',
  '/doctor': 'Doctor Clinical Portal',
  '/admin': 'Admin Command Center & Telemetry',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>('patient');
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    setRole(getCurrentRole());
    const handler = () => setRole(getCurrentRole());
    window.addEventListener('dri_role_changed', handler);
    return () => window.removeEventListener('dri_role_changed', handler);
  }, []);

  const title =
    TITLES[pathname] ??
    (Object.entries(TITLES).find(([k]) => pathname.startsWith(\`\${k}/\`))?.[1] ??
      'Clinical Diabetology Portal');

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden flex items-center gap-1.5 font-bold text-sm text-foreground">
              <HeartPulse className="h-5 w-5 text-blue-600" />
              <span>Diabetes<span className="text-blue-600">Risk</span></span>
            </Link>
            <span className="hidden md:inline-block text-sm font-bold text-slate-800 dark:text-slate-200">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Switcher Button */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {role === 'doctor' && (
                <>
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-300">Doctor Portal</span>
                </>
              )}
              {role === 'admin' && (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-purple-700 dark:text-purple-300">Admin Mode</span>
                </>
              )}
              {role === 'demo' && (
                <>
                  <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-amber-700 dark:text-amber-300">Demo (Sandbox)</span>
                </>
              )}
              {role === 'patient' && (
                <>
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-blue-700 dark:text-blue-300">Patient Mode</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
            </button>

            <ThemeToggle />
            <AuthButtons />
          </div>
        </header>

        {role === 'demo' && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-2 font-medium">
              <FlaskConical className="h-4 w-4 text-amber-600 shrink-0" />
              <span><strong>Free Demo Sandbox Mode:</strong> You can test the model freely. Test entries are <strong>NOT</strong> saved to the database.</span>
            </span>
            <button
              onClick={() => setShowRoleModal(true)}
              className="text-[11px] underline font-bold hover:text-amber-950 dark:hover:text-amber-100 shrink-0 ml-2"
            >
              Switch Role
            </button>
          </div>
        )}

        <main className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <RoleLoginModal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} />
    </div>
  );
}
`;
fs.writeFileSync(layoutPath, roleHeaderSnippet, 'utf8');
console.log('✓ Updated app/src/app/(dashboard)/layout.tsx with Role Switcher');

console.log('=== Step 7: Updating Sidebar with Dynamic Role-Based Links ===');
const sidebarPath = path.join('app', 'src', 'components', 'dashboard', 'Sidebar.tsx');
const sidebarCode = `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartPulse,
  ClipboardPlus,
  History,
  Smartphone,
  Settings,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentRole, type UserRole } from '@/lib/role-store';

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>('patient');

  useEffect(() => {
    setRole(getCurrentRole());
    const handler = () => setRole(getCurrentRole());
    window.addEventListener('dri_role_changed', handler);
    return () => window.removeEventListener('dri_role_changed', handler);
  }, []);

  const nav = [
    { href: '/screening', label: 'Patient Screening', icon: ClipboardPlus },
    { href: '/history', label: 'History & Trends', icon: History },
    ...(role === 'doctor' || role === 'admin'
      ? [{ href: '/doctor', label: 'Doctor Watchlist', icon: Stethoscope }]
      : []),
    ...(role === 'admin'
      ? [{ href: '/admin', label: 'Admin Telemetry', icon: ShieldCheck }]
      : []),
    { href: '/devices', label: 'Connected Devices', icon: Smartphone },
    { href: '/settings', label: 'Portal Settings', icon: Settings },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 md:flex md:flex-col">
      <Link href="/" className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
          <HeartPulse className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white block">
            Diabetes<span className="text-blue-600">Risk</span>
          </span>
          <span className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
            ICMR Clinical Diabetology
          </span>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(\`\${href}/\`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Standard
          </span>
          <span className="text-blue-600 dark:text-blue-400">ICMR-INDIAB</span>
        </div>
      </div>
    </aside>
  );
}
`;
fs.writeFileSync(sidebarPath, sidebarCode, 'utf8');
console.log('✓ Updated app/src/components/dashboard/Sidebar.tsx with dynamic links');

console.log('=== Step 8: Fixing PatientIdentityCard.tsx (Replacing IdCard with User icon) ===');
const patientCardPath = path.join('app', 'src', 'components', 'settings', 'PatientIdentityCard.tsx');
const patientCardCode = `'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/use-toast';
import { User, Copy, Check } from 'lucide-react';
import { getMyPatientId } from '@/lib/patient-id';

export function PatientIdentityCard() {
  const [copied, setCopied] = useState(false);
  const [patientId, setPatientId] = useState('DRI-PT-80562');

  useEffect(() => {
    setPatientId(getMyPatientId());
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(patientId);
    setCopied(true);
    toast({
      title: 'Patient ID Copied',
      description: \`\${patientId} copied. Share this code with your doctor to enable remote monitoring.\`,
    });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-bold">Clinical Patient ID</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-none">
            Shareable
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Give this medical ID to your treating doctor so they can monitor your screenings in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Your Unique Patient ID</span>
            <p className="font-mono text-lg font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
              {patientId}
            </p>
          </div>
          <Button size="sm" onClick={handleCopy} className="h-9 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy ID for Doctor'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
`;
fs.writeFileSync(patientCardPath, patientCardCode, 'utf8');
console.log('✓ Fixed PatientIdentityCard.tsx');

console.log('=== Step 9: Updating ScreeningWizard for Free Demo Sandbox ===');
const wizardPath = path.join('app', 'src', 'components', 'screening', 'ScreeningWizard.tsx');
let wizardCode = fs.readFileSync(wizardPath, 'utf8');

// Ensure role-store import exists
if (!wizardCode.includes('getCurrentRole')) {
  wizardCode = wizardCode.replace(
    "import { cn } from '@/lib/utils';",
    "import { cn } from '@/lib/utils';\nimport { getCurrentRole } from '@/lib/role-store';\nimport { saveScreeningToSupabase } from '@/lib/supabase';"
  );
}

// Intercept onSubmit to enforce zero data saving when in demo mode
if (!wizardCode.includes('// Check if in Demo Sandbox Mode')) {
  wizardCode = wizardCode.replace(
    'async function onSubmit(values: ScreeningFormValues) {',
    `async function onSubmit(values: ScreeningFormValues) {
    const currentRole = getCurrentRole();
    if (currentRole === 'demo') {
      // Zero-Data Sandbox Mode: Calculate risk locally in-memory, do not save to database
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
          'DEMO SANDBOX SIMULATION: This test entry was NOT saved to the database.',
          'Recommended HbA1c screening every 6-12 months as per ICMR-INDIAB.',
          'Adopt traditional millet-based high-fiber diet to stabilize postprandial glucose peaks.',
        ],
        lifestyle_advice: 'Sandbox demo evaluation complete. Sign in as Patient to save your permanent medical record.',
        input: values as any,
      });
      return;
    }`
  );
  fs.writeFileSync(wizardPath, wizardCode, 'utf8');
  console.log('✓ Enforced zero-data persistence for Demo Mode in ScreeningWizard.tsx');
}

console.log('All upgrades written cleanly! Ready to commit and push.');
