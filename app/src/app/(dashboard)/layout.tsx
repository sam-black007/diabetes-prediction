'use client';

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
    (Object.entries(TITLES).find(([k]) => pathname.startsWith(`${k}/`))?.[1] ??
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
