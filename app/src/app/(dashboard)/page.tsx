'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ClipboardPlus,
  HeartPulse,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHistory } from '@/hooks/useHistory';

export default function ClinicalDashboardPage() {
  const { data, isLoading } = useHistory({ limit: 5, offset: 0 });
  const total = data?.total ?? 0;
  const recent = data?.screenings ?? [];

  return (
    <div className="space-y-6 font-sans">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clinical Diabetology & Metabolic Hub
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              ICMR-INDIAB Protocol
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated South Asian phenotype risk stratification, MDRF IDRS, and atherogenic dyslipidemia evaluation.
          </p>
        </div>

        <Button asChild size="sm" className="h-9 gap-1.5 font-semibold text-xs shadow-xs">
          <Link href="/screening">
            <Plus className="h-4 w-4" /> Start New Screening
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Evaluations Completed</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {isLoading ? '...' : total}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all risk categories</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">MDRF IDRS Standard</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">95.4%</div>
          <p className="text-[11px] text-emerald-600 mt-1">Diagnostic sensitivity</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">TG / HDL Atherogenic Target</span>
            <HeartPulse className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">&lt; 2.0</div>
          <p className="text-[11px] text-slate-500 mt-1">South Asian insulin resistance cutoff</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Asian-Indian BMI Cutoff</span>
            <Activity className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            23.0 <span className="text-xs font-normal text-slate-500">kg/m²</span>
          </div>
          <p className="text-[11px] text-red-600 mt-1">Overweight threshold per ICMR</p>
        </div>
      </div>
    </div>
  );
}
