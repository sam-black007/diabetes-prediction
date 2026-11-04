'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Download,
  FileJson,
  FileText,
  RotateCcw,
  Share2,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Separator } from '@/components/ui/Separator';
import { HealthScoreGauge } from '@/components/screening/HealthScoreGauge';
import { RiskBadge } from '@/components/screening/RiskBadge';
import { RuleCard } from '@/components/screening/RuleCard';
import { ShapChart } from '@/components/screening/ShapChart';
import { ScreeningPdfButton } from '@/components/screening/ScreeningPdfButton';
import { WhatIfSimulator } from '@/components/screening/WhatIfSimulator';
import { DoctorDiscussionGuide } from '@/components/screening/DoctorDiscussionGuide';
import { PersonalizedActionPlan } from '@/components/screening/PersonalizedActionPlan';
import { downloadExport } from '@/lib/api';
import { useApiToken } from '@/lib/auth-token';
import type { ScreeningResult } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const ml = result.ml_result;
  const mlScore = typeof ml?.risk_score === 'number' ? ml.risk_score : ml?.score;
  const shap = ml?.shap_values as Record<string, number> | null | undefined;

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
      // server persistence is required for exports
    }
  }

  const isHighRisk = result.risk_category === 'high' || result.risk_category === 'very_high';
  const isModerateRisk = result.risk_category === 'medium';

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Emergency / Urgent Clinical Alert */}
      {result.emergency_flags && result.emergency_flags.length > 0 && (
        <Alert variant="destructive" className="border-red-500/50 shadow-md">
          <AlertTitle className="text-base font-bold flex items-center gap-2">
            Immediate attention advised
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {result.emergency_flags.map((f, i) => (
              <div key={i} className="text-sm">
                <strong>{f.type}</strong> — {f.urgency}
                {f.action && f.action.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 space-y-0.5">
                    {f.action.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Clinical Summary Card */}
      <Card
        className={cn(
          'relative overflow-hidden border shadow-sm',
          isHighRisk
            ? 'border-red-500/30 bg-gradient-to-br from-red-500/5 via-background to-background'
            : isModerateRisk
            ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-background'
            : 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-background'
        )}
      >
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <HealthScoreGauge score={result.health_score} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <RiskBadge category={result.risk_category} />
                {mlScore != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Sparkles className="h-3 w-3 text-primary" /> ML Model Risk: {(mlScore * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-foreground">
                  Score {result.health_score} <span className="text-base font-normal text-muted-foreground">/ 100</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {result.health_score >= 80
                    ? 'Optimal metabolic balance according to clinical evaluation.'
                    : result.health_score >= 60
                    ? 'Moderate metabolic risk factors identified. Lifestyle monitoring advised.'
                    : 'Elevated diabetes risk indicated. Clinical evaluation recommended.'}
                </p>
              </div>
              {result.created_at && (
                <p className="text-[11px] text-muted-foreground">Screened: {formatDate(result.created_at)}</p>
              )}
            </div>
          </div>

          {/* Export & Actions */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-2 shrink-0">
            <ScreeningPdfButton result={result} />
            <Button variant="outline" size="sm" onClick={() => handleServerExport('fhir')} className="text-xs">
              <FileJson className="mr-1.5 h-3.5 w-3.5 text-primary" /> FHIR R4
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleServerExport('cda')} className="text-xs">
              <Share2 className="mr-1.5 h-3.5 w-3.5 text-primary" /> CDA XML
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Follow-Up Plan */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" /> Recommended follow-up
          </CardTitle>
          <CardDescription>Clinical timeline guidance based on ADA 2026 protocols</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
            {result.followup_schedule?.when ?? 'Within 3–6 months'}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.followup_schedule?.text ??
              'Schedule routine follow-up with your primary care provider for repeat fasting glucose or HbA1c testing.'}
          </p>
        </CardContent>
      </Card>

      {/* Clinical Findings Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Clinical findings
          </h2>
          <span className="text-xs text-muted-foreground">ADA & AHA/ACC Evaluated</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {result.glucose_rules?.map((r, i) => <RuleCard key={`glucose-${i}`} rule={r} />)}
          {result.bp_rule && <RuleCard rule={result.bp_rule} />}
          {result.bmi_rule && <RuleCard rule={result.bmi_rule} />}
          {result.lipid_rules?.map((r, i) => <RuleCard key={`lipid-${i}`} rule={r} />)}
        </div>
      </section>

      {/* SHAP Explainability Breakdown */}
      {shap && Object.keys(shap).length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Why this ML score? (SHAP)</CardTitle>
              <span className="text-xs text-muted-foreground">Explainable AI</span>
            </div>
            <CardDescription>
              SHAP feature attributions show which metabolic factors push risk higher (red) or lower (green).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShapChart values={shap} />
            <p className="mt-3 text-xs text-muted-foreground">
              Statistical risk attribution based on gradient-boosted ensemble modeling. Not a standalone diagnosis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Personalized Medical Action Plan (ADA 2026 Diet & Lifestyle) */}
      <PersonalizedActionPlan result={result} />

      {/* Interactive Risk & Goal Simulator */}
      <WhatIfSimulator result={result} />

      {/* Doctor Discussion Guide & Summary Copy */}
      <DoctorDiscussionGuide result={result} />

      <Separator />

      {/* Bottom Navigation Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href="/screening">
            <RotateCcw className="mr-2 h-4 w-4" /> Start New Screening
          </Link>
        </Button>
        <Button asChild variant="default">
          <Link href="/history">
            View Screening History & Trends <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
