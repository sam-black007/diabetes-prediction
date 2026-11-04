'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Droplets,
  HeartPulse,
  Info,
  Loader2,
  Scale,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { NumberField, SelectField } from '@/components/screening/fields';
import { ResultView } from '@/components/screening/ResultView';
import { LabReportImportModal } from '@/components/screening/LabReportImportModal';
import { getGlucoseFeedback, getBmiFeedback, getBpFeedback } from '@/components/screening/clinical-feedback';
import { useSubmitScreening } from '@/hooks/useScreening';
import {
  screeningSchema,
  stepFields,
  type ScreeningFormValues,
} from '@/lib/validation/screening';
import type { ScreeningResult } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Glucose', subtitle: 'Plasma glucose & HbA1c', icon: Droplets },
  { title: 'Vitals & Lipids', subtitle: 'BP, BMI & cholesterol', icon: HeartPulse },
  { title: 'Demographics', subtitle: 'Age, sex & family history', icon: User },
];

const GLUCOSE_TYPES = [
  { value: 'fasting', label: 'Fasting plasma glucose (FPG)' },
  { value: 'postprandial', label: 'Post-meal (2h postprandial)' },
  { value: 'random', label: 'Random casual plasma glucose' },
  { value: 'hba1c', label: 'Hemoglobin A1c (HbA1c %)' },
  { value: 'ogtt', label: '2-hour Oral Glucose Tolerance (OGTT)' },
];

export function ScreeningWizard() {
  const [step, setStep] = useState(0);
  const stepChangedAt = useRef(Date.now());
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const { submit, isPending, queued, reset } = useSubmitScreening();
  const searchParams = useSearchParams();

  const form = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningSchema),
    defaultValues: {
      glucose_type: 'fasting',
      family_history: false,
      unit_preference: 'mg_dL',
      medications: [],
      comorbidities: [],
    },
    mode: 'onTouched',
  });

  const { register, handleSubmit, trigger, setValue, watch, formState } = form;

  // Watch fields for live real-time feedback
  const watchedGlucose = watch('glucose_mg_dl');
  const watchedGlucoseType = watch('glucose_type');
  const watchedHeight = watch('height_cm');
  const watchedWeight = watch('weight_kg');
  const watchedSbp = watch('sbp');
  const watchedDbp = watch('dbp');

  const glucoseFeedback = getGlucoseFeedback(
    typeof watchedGlucose === 'number' ? watchedGlucose : undefined,
    watchedGlucoseType
  );
  const bmiFeedback = getBmiFeedback(
    typeof watchedHeight === 'number' ? watchedHeight : undefined,
    typeof watchedWeight === 'number' ? watchedWeight : undefined
  );
  const bpFeedback = getBpFeedback(
    typeof watchedSbp === 'number' ? watchedSbp : undefined,
    typeof watchedDbp === 'number' ? watchedDbp : undefined
  );

  const PRESETS: Record<'healthy' | 'prediabetes' | 'highRisk' | 'hba1cCase', Partial<ScreeningFormValues>> = {
    healthy: {
      glucose_mg_dl: 88,
      glucose_type: 'fasting',
      sbp: 116,
      dbp: 74,
      height_cm: 172,
      weight_kg: 66,
      age: 32,
      sex: 'M',
      family_history: false,
    },
    prediabetes: {
      glucose_mg_dl: 118,
      glucose_type: 'fasting',
      sbp: 132,
      dbp: 84,
      height_cm: 174,
      weight_kg: 84,
      age: 48,
      sex: 'F',
      family_history: true,
    },
    highRisk: {
      glucose_mg_dl: 165,
      glucose_type: 'fasting',
      sbp: 148,
      dbp: 92,
      height_cm: 170,
      weight_kg: 96,
      age: 58,
      sex: 'M',
      family_history: true,
    },
    hba1cCase: {
      glucose_mg_dl: 7.2,
      glucose_type: 'hba1c',
      sbp: 138,
      dbp: 88,
      height_cm: 176,
      weight_kg: 89,
      age: 52,
      sex: 'M',
      family_history: true,
    },
  };

  function loadPreset(presetKey: 'healthy' | 'prediabetes' | 'highRisk' | 'hba1cCase') {
    const preset = PRESETS[presetKey];
    form.reset({
      ...form.getValues(),
      ...preset,
    });
  }

  useEffect(() => {
    const presetParam = searchParams.get('preset');
    if (presetParam === 'healthy' || presetParam === 'prediabetes' || presetParam === 'highRisk' || presetParam === 'hba1cCase') {
      loadPreset(presetParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function next() {
    const ok = await trigger(stepFields[step] as never);
    if (ok) {
      stepChangedAt.current = Date.now();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: ScreeningFormValues) {
    // Guard 1: Never allow premature submission if enter key was pressed on Step 1 or 2
    if (step < STEPS.length - 1) {
      await next();
      return;
    }
    // Guard 2: Prevent accidental submit within 400ms of entering the final step (protects against double-click)
    if (Date.now() - stepChangedAt.current < 400) {
      return;
    }
    const payload = {
      ...values,
      medications: values.medications ?? [],
      comorbidities: values.comorbidities ?? [],
    };
    const res = await submit(payload);
    if (res) setResult(res);
  }

  if (queued) {
    return (
      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Saved Offline
          </CardTitle>
          <CardDescription>
            This screening has been saved securely on your device and will sync automatically once you are back online.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/history">
            <Button variant="outline">
              View History <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => reset()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Run Another Screening
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        <ResultView result={result} />
        <div className="pt-2 flex justify-start">
          <Button variant="outline" onClick={() => setResult(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Run New Screening
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Interactive Step Navigator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {STEPS.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = step === idx;
          const isCompleted = step > idx;

          return (
            <button
              key={s.title}
              type="button"
              onClick={() => {
                stepChangedAt.current = Date.now();
                setStep(idx);
              }}
              className={cn(
                'flex flex-col sm:flex-row items-center sm:items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer',
                isActive
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                  : isCompleted
                  ? 'border-border/80 bg-background/70 hover:bg-muted/40'
                  : 'border-border/40 bg-background/40 hover:bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <div className="text-xs font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1">
                  <span>Step {idx + 1}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate hidden sm:block">
                  {s.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Diabetes Risk Screening
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Step {step + 1} of {STEPS.length}: {STEPS[step].subtitle}
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 self-start sm:self-auto"
              onClick={() => setShowLabModal(true)}
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste / Import Lab Report
            </Button>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Clinical Profile Presets */}
          <div className="rounded-xl border border-primary/20 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Quick Clinical Presets
              </span>
              <span className="text-[11px] text-muted-foreground">Click to populate sample patient profile</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                onClick={() => loadPreset('healthy')}
              >
                🟢 Healthy Baseline
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                onClick={() => loadPreset('prediabetes')}
              >
                🟡 Prediabetes Risk
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                onClick={() => loadPreset('highRisk')}
              >
                🔴 High Risk Case
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/30"
                onClick={() => loadPreset('hba1cCase')}
              >
                🟣 HbA1c Case (7.2%)
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (step < STEPS.length - 1) {
                  e.preventDefault();
                  next();
                }
              }
            }}
            className="space-y-6"
          >
            {/* Step 1: Glucose */}
            <div className={cn("space-y-4", step !== 0 && "hidden")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Glucose"
                    unit={watchedGlucoseType === 'hba1c' ? '%' : 'mg/dL'}
                    hint={watchedGlucoseType === 'hba1c' ? 'e.g. 5.7%' : 'Leave blank if unknown'}
                    error={formState.errors.glucose_mg_dl?.message}
                    {...register('glucose_mg_dl')}
                  />
                  <SelectField
                    label="Measurement type"
                    value={watch('glucose_type')}
                    onChange={(v) => setValue('glucose_type', v as ScreeningFormValues['glucose_type'])}
                    options={GLUCOSE_TYPES}
                  />
                </div>

                {/* Instant Real-Time Clinical Feedback */}
                {glucoseFeedback && (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium animate-in fade-in',
                      glucoseFeedback.color
                    )}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Clinical range: {glucoseFeedback.label}</span>
                  </div>
                )}
            </div>

            {/* Step 2: Vitals & Lipids */}
            <div className={cn("space-y-4", step !== 1 && "hidden")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Systolic blood pressure"
                    unit="mmHg"
                    hint="Normal: < 120"
                    error={formState.errors.sbp?.message}
                    {...register('sbp')}
                  />
                  <NumberField
                    label="Diastolic blood pressure"
                    unit="mmHg"
                    hint="Normal: < 80"
                    error={formState.errors.dbp?.message}
                    {...register('dbp')}
                  />
                  <NumberField
                    label="Height"
                    unit="cm"
                    hint="e.g. 175 cm"
                    error={formState.errors.height_cm?.message}
                    {...register('height_cm')}
                  />
                  <NumberField
                    label="Weight"
                    unit="kg"
                    hint="e.g. 72 kg"
                    error={formState.errors.weight_kg?.message}
                    {...register('weight_kg')}
                  />
                  <NumberField
                    label="LDL cholesterol"
                    unit="mg/dL"
                    hint="Optimal: < 100"
                    error={formState.errors.ldl_mg_dl?.message}
                    {...register('ldl_mg_dl')}
                  />
                  <NumberField
                    label="HDL cholesterol"
                    unit="mg/dL"
                    hint="Optimal: > 40 (M), > 50 (F)"
                    error={formState.errors.hdl_mg_dl?.message}
                    {...register('hdl_mg_dl')}
                  />
                  <NumberField
                    label="Triglycerides"
                    unit="mg/dL"
                    hint="Normal: < 150"
                    error={formState.errors.triglycerides_mg_dl?.message}
                    {...register('triglycerides_mg_dl')}
                  />
                </div>

                {/* Dynamic Calculated BMI and BP pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {bmiFeedback && (
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium animate-in fade-in',
                        bmiFeedback.color
                      )}
                    >
                      <Scale className="h-3.5 w-3.5 shrink-0" />
                      <span>{bmiFeedback.label}</span>
                    </div>
                  )}
                  {bpFeedback && (
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium animate-in fade-in',
                        bpFeedback.color
                      )}
                    >
                      <HeartPulse className="h-3.5 w-3.5 shrink-0" />
                      <span>{bpFeedback.label}</span>
                    </div>
                  )}
                </div>
            </div>

            {/* Step 3: Demographics & History */}
            <div className={cn("space-y-4", step !== 2 && "hidden")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Age"
                    unit="years"
                    hint="Adult screening: 18 – 99"
                    error={formState.errors.age?.message}
                    {...register('age')}
                  />
                  <SelectField
                    label="Sex"
                    value={watch('sex') ?? ''}
                    onChange={(v) => setValue('sex', v as 'M' | 'F')}
                    options={[
                      { value: 'F', label: 'Female' },
                      { value: 'M', label: 'Male' },
                    ]}
                    placeholder="Select…"
                  />
                  <SelectField
                    label="Pregnancy status"
                    value={watch('pregnancy_status') ?? ''}
                    onChange={(v) =>
                      setValue('pregnancy_status', v as ScreeningFormValues['pregnancy_status'])
                    }
                    options={[
                      { value: 'none', label: 'Not applicable' },
                      { value: 'gestational', label: 'Gestational' },
                      { value: 'preexisting', label: 'Pre-existing' },
                    ]}
                    placeholder="Optional"
                  />
                  <div className="flex items-center pt-2 sm:pt-6">
                    <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        {...register('family_history')}
                      />
                      Family history of diabetes (parents or siblings)
                    </label>
                  </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className={cn('flex items-center justify-between pt-4 border-t', step === 0 && 'justify-end')}>
              {step > 0 && (
                <Button type="button" variant="outline" onClick={back} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}

              {step < STEPS.length - 1 ? (
                <Button
                  key="step-btn-next"
                  type="button"
                  onClick={next}
                  className="gap-1.5"
                >
                  {step === 0 ? 'Next: Vitals & Lipids' : 'Next: Demographics (Step 3)'} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  key="step-btn-submit"
                  type="submit"
                  disabled={isPending}
                  className="gap-2 px-6"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Calculate Risk Score
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {showLabModal && (
        <LabReportImportModal
          setValue={setValue}
          onClose={() => setShowLabModal(false)}
        />
      )}
    </div>
  );
}
