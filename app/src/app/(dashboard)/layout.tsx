'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardPlus,
  History,
  Smartphone,
  Settings,
  HeartPulse,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AuthButtons } from '@/components/auth/AuthButtons';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const TITLES: Record<string, string> = {
  '/screening': 'Clinical Biomarker Screening',
  '/history': 'Patient Screening Registry',
  '/devices': 'Connected CGM & Vitals Devices',
  '/settings': 'Clinical Portal Settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              ICMR Clinical Engine Active
            </span>
            <ThemeToggle />
            <AuthButtons />
          </div>
        </header>

        <main className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
