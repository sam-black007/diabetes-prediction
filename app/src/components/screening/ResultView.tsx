'use client';

import Link from 'next/link';
import {
  RotateCcw,
  CalendarClock,
  FileJson,
  Share2,
  Stethoscope,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Separator } from '@/components/ui/Separator';
import { HealthScoreGauge } from '@/components/screening/HealthScoreGauge';
import { RiskBadge } from '@/components/screening/RiskBadge';
import { RuleCard } from '@/components/screening/RuleCard';
import { ScreeningPdfButton } from '@/components/screening/ScreeningPdfButton';
import { WhatIfSimulator } from '@/components/screening/WhatIfSimulator';
import { GeminiDynamicInsights } from '@/components/screening/GeminiDynamicInsights';
import { downloadExport } from '@/lib/api';
import { useApiToken } from '@/lib/auth-token';
import type { ScreeningResult } from '@/lib/types';
import { useState } from 'react';

function formatDate(iso: string | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ResultView({ result }: { result: ScreeningResult }) {
  const getToken = useApiToken();
  const [showSimulator, setShowSimulator] = useState(false);

  async function handleServerExport(format: 'fhir' | 'cda') {
    if (!result.id) return;
    try {
      const token = await getToken();
      const blob = await downloadExport(result.id, format, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screening-${result.id}.${format === 'fhir' ? 'fhir.json' : 'cda.xml'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // server export
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {result.emergency_flags && result.emergency_flags.length > 0 && (
        <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/40 shadow-sm">
          <AlertTitle className="text-sm font-bold flex items-center gap-2 text-red-900 dark:text-red-200">
            Immediate Clinical Triage Required
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs text-red-800 dark:text-red-300">
            {result.emergency_flags.map((f, i) => (
              <div key={i}>
                <strong>{f.type}</strong> - {f.urgency}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Hospital EHR Diagnostic Header */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <HealthScoreGauge score={result.health_score} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RiskBadge category={result.risk_category} />
                <span className="text-xs font-semibold text-slate-500">
                  Screening ID: #{result.id ? result.id.slice(0, 8) : 'PAT-DIAB'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Metabolic Health Index: {result.health_score} / 100
              </h2>
              <p className="text-xs text-slate-500">
                {result.created_at ? `Evaluated on ${formatDate(result.created_at)}` : 'Real-time Clinical Triage'} - ICMR & RSSDI Aligned
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
            <ScreeningPdfButton result={result} />
            <Button variant="outline" size="sm" onClick={() => handleServerExport('fhir')} className="text-xs h-9">
              <FileJson className="mr-1.5 h-3.5 w-3.5" /> FHIR R4
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleServerExport('cda')} className="text-xs h-9">
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> CDA XML
            </Button>
          </div>
        </div>
      </div>

      {/* Primary Indian Clinical Diagnostic Report */}
      <GeminiDynamicInsights result={result} />

      {/* Biomarker Rules */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            Clinical Biomarker Threshold Verifications
          </h3>
          <span className="text-[11px] text-slate-500">ICMR / ADA Criteria</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {result.glucose_rules?.map((r, i) => <RuleCard key={`glucose-${i}`} rule={r} />)}
          {result.bp_rule && <RuleCard rule={result.bp_rule} />}
          {result.bmi_rule && <RuleCard rule={result.bmi_rule} />}
          {result.lipid_rules?.map((r, i) => <RuleCard key={`lipid-${i}`} rule={r} />)}
        </div>
      </div>

      {/* Follow-up Plan */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Clinical Rescreening Protocol
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {result.followup_schedule?.text ?? 'Schedule follow-up venous HbA1c and fasting blood glucose evaluation.'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold whitespace-nowrap">
          {result.followup_schedule?.when ?? 'Within 3 months'}
        </span>
      </div>

      {/* Collapsible Sensitivity Simulator */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <span>Interactive Biometric Sensitivity Simulator (Goal Modeling)</span>
          </div>
          <span className="text-xs text-blue-600 font-medium">
            {showSimulator ? 'Hide Simulator' : 'Adjust Targets'}
          </span>
        </button>

        {showSimulator && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <WhatIfSimulator result={result} />
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button asChild variant="outline" className="h-9 text-xs">
          <Link href="/screening">
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Start New Screening
          </Link>
        </Button>
        <Button asChild variant="default" className="h-9 text-xs">
          <Link href="/history">
            View Patient History & Longitudinal Trends <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
