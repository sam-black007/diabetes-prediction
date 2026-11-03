'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartPulse,
  ClipboardPlus,
  History,
  Smartphone,
  Settings,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/screening', label: 'New screening', icon: ClipboardPlus },
  { href: '/history', label: 'History & Trends', icon: History },
  { href: '/devices', label: 'Connected Devices', icon: Smartphone },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/60 backdrop-blur-sm md:flex md:flex-col">
      <Link href="/" className="flex items-center gap-2.5 border-b px-5 py-4 transition-colors hover:bg-muted/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <HeartPulse className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm font-bold tracking-tight">
          Diabetes<span className="text-primary font-semibold">Risk</span>
          <span className="block text-[10px] font-normal text-muted-foreground uppercase tracking-widest">Intelligence v2.0</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* System Status & Docs */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">ML Model</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'https://diabetes-prediction-api-9hx8.onrender.com'}/docs`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Interactive API Docs
        </a>
      </div>
    </aside>
  );
}
