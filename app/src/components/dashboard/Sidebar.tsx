'use client';

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
          const active = pathname === href || pathname.startsWith(`${href}/`);
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
