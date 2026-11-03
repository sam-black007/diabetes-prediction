'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ClipboardPlus,
  History,
  Smartphone,
  Settings,
  HeartPulse,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AuthButtons } from '@/components/auth/AuthButtons';
import { OfflineSyncManager } from '@/components/pwa/OfflineSyncManager';
import { cn } from '@/lib/utils';

const TITLES: Record<string, string> = {
  '/screening': 'New screening',
  '/history': 'Screening history',
  '/devices': 'Connected devices',
  '/settings': 'Settings',
};

const MOBILE_NAV = [
  { href: '/screening', label: 'Screening', icon: ClipboardPlus },
  { href: '/history', label: 'History', icon: History },
  { href: '/devices', label: 'Devices', icon: Smartphone },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (Object.entries(TITLES).find(([k]) => pathname.startsWith(`${k}/`))?.[1] ??
      'Dashboard');

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden flex items-center gap-1.5 font-bold text-sm text-foreground">
              <HeartPulse className="h-5 w-5 text-primary" />
              <span>Diabetes<span className="text-primary font-semibold">Risk</span></span>
            </Link>
            <span className="hidden md:inline-block text-base font-semibold">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Backend</span> Live
            </div>
            <AuthButtons />
          </div>
        </header>

        <main className="flex-1 bg-muted/30 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t bg-background/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <OfflineSyncManager />
    </div>
  );
}
