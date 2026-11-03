'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stethoscope, Copy, Check, MessageSquare } from 'lucide-react';
import type { ScreeningResult } from '@/lib/types';

interface DoctorDiscussionGuideProps {
  result: ScreeningResult;
}

export function DoctorDiscussionGuide({ result }: DoctorDiscussionGuideProps) {
  const [copied, setCopied] = useState(false);

  const glucose = result.input?.glucose_mg_dl;
  const sbp = result.input?.sbp;
  const dbp = result.input?.dbp;
  const risk = result.risk_category;
  const mlScore = result.ml_result?.risk_score ?? result.ml_result?.score;

  // Generate tailored questions
  const questions: string[] = [];

  if (glucose && glucose >= 100) {
    questions.push('Would a confirmatory fasting plasma glucose or laboratory HbA1c test be appropriate?');
  }
  if ((sbp && sbp >= 130) || (dbp && dbp >= 80)) {
    questions.push('Should we monitor blood pressure more frequently or discuss lifestyle adjustments for cardiovascular risk?');
  }
  if (result.bmi_rule && result.bmi_rule.category !== 'normal') {
    questions.push('Are there medical nutrition therapy or structured diabetes prevention programs (DPP) available for my profile?');
  }
  if (result.input?.family_history) {
    questions.push('Given my family history of diabetes, what is the recommended annual screening protocol?');
  }
  if (questions.length === 0) {
    questions.push('What preventive lifestyle milestones should I maintain over the next 12 months?');
  }

  function copyClinicalSummary() {
    const lines = [
      `DIABETES RISK SCREENING SUMMARY`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Health Score: ${result.health_score} / 100`,
      `Risk Category: ${result.risk_category.toUpperCase()}`,
      mlScore != null ? `Model Risk Probability: ${(mlScore * 100).toFixed(1)}%` : '',
      `Measurements:`,
      glucose ? ` - Glucose: ${glucose} mg/dL (${result.input?.glucose_type || 'fasting'})` : '',
      sbp && dbp ? ` - Blood Pressure: ${sbp}/${dbp} mmHg` : '',
      result.input?.weight_kg && result.input?.height_cm ? ` - Weight/Height: ${result.input.weight_kg}kg / ${result.input.height_cm}cm` : '',
      `\nKey Discussion Points:`,
      ...questions.map((q, i) => `${i + 1}. ${q}`),
      `\n(Screening assessment for clinical discussion — not an official diagnosis)`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Questions for Your Doctor</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={copyClinicalSummary} className="text-xs">
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Copied Note
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Summary
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Bring these personalized clinical talking points to your next doctor or clinic visit.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-2.5">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
