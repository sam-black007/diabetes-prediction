'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { NumberField, SelectField } from '@/components/screening/fields';
import { ResultView } from '@/components/screening/ResultView';
import { LabReportImportModal } from '@/components/screening/LabReportImportModal';
import { useSubmitScreening } from '@/hooks/useScreening';
import {
  screeningSchema,
  stepFields,
  type ScreeningFormValues,
} from '@/lib/validation/screening';
import type { ScreeningResult } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS = ['Glucose', 'Vitals & lipids', 'About you'];

const GLUCOSE_TYPES = [
  { value: 'fasting', label: 'Fasting plasma glucose' },
  { value: 'postprandial', label: 'Post-meal (2h)' },
  { value: 'random', label: 'Random' },
  { value: 'hba1c', label: 'HbA1c' },
  { value: 'ogtt', label: 'OGTT' },
];

export function ScreeningWizard() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const { submit, isPending, queued, reset } = useSubmitScreening();

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

  async function next() {
    const ok = await trigger(stepFields[step] as never);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: ScreeningFormValues) {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Check className="h-5 w-5 text-emerald-600" /> Saved offline
          </CardTitle>
          <CardDescription>
            This screening is stored on your device and will sync automatically once
            you&apos;re back online.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/history">
            <Button variant="outline">
              View history <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => reset()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Run another screening
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <ResultView result={result} />
        <div className="pt-2">
          <Button variant="ghost" onClick={() => setResult(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Run another screening
          </Button>
        </div>
      </div>
    );
  }

    function loadPreset(presetKey: 'healthy' | 'prediabetes' | 'highRisk') {
    if (presetKey === 'healthy') {
      setValue('glucose_mg_dl', 88);
      setValue('glucose_type', 'fasting');
      setValue('sbp', 116);
      setValue('dbp', 74);
      setValue('height_cm', 172);
      setValue('weight_kg', 66);
      setValue('age', 32);
      setValue('sex', 'M');
      setValue('family_history', false);
    } else if (presetKey === 'prediabetes') {
      setValue('glucose_mg_dl', 118);
      setValue('glucose_type', 'fasting');
      setValue('sbp', 132);
      setValue('dbp', 84);
      setValue('height_cm', 174);
      setValue('weight_kg', 84);
      setValue('age', 48);
      setValue('sex', 'F');
      setValue('family_history', true);
    } else if (presetKey === 'highRisk') {
      setValue('glucose_mg_dl', 165);
      setValue('glucose_type', 'fasting');
      setValue('sbp', 148);
      setValue('dbp', 92);
      setValue('height_cm', 170);
      setValue('weight_kg', 96);
      setValue('age', 58);
      setValue('sex', 'M');
      setValue('family_history', true);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle className="text-xl">Diabetes risk screening</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>

      <CardContent>
        {/* Quick Clinical Profile Presets */}
        <div className="mb-6 rounded-lg border border-primary/20 bg-muted/30 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Quick Clinical Presets
            </span>
            <span className="text-[11px] text-muted-foreground">Click to populate sample profile</span>
          </div>
          <div className="flex flex-wrap gap-2">
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

            <div className="h-4 w-px bg-border my-auto mx-1" />

            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowLabModal(true)}
            >
              📋 Paste / Import Lab Report
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Glucose"
                unit="mg/dL"
                hint="Leave blank if unknown"
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
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Systolic blood pressure"
                unit="mmHg"
                error={formState.errors.sbp?.message}
                {...register('sbp')}
              />
              <NumberField
                label="Diastolic blood pressure"
                unit="mmHg"
                error={formState.errors.dbp?.message}
                {...register('dbp')}
              />
              <NumberField
                label="Height"
                unit="cm"
                error={formState.errors.height_cm?.message}
                {...register('height_cm')}
              />
              <NumberField
                label="Weight"
                unit="kg"
                error={formState.errors.weight_kg?.message}
                {...register('weight_kg')}
              />
              <NumberField
                label="LDL cholesterol"
                unit="mg/dL"
                error={formState.errors.ldl_mg_dl?.message}
                {...register('ldl_mg_dl')}
              />
              <NumberField
                label="HDL cholesterol"
                unit="mg/dL"
                error={formState.errors.hdl_mg_dl?.message}
                {...register('hdl_mg_dl')}
              />
              <NumberField
                label="Triglycerides"
                unit="mg/dL"
                error={formState.errors.triglycerides_mg_dl?.message}
                {...register('triglycerides_mg_dl')}
              />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Age"
                unit="years"
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    {...register('family_history')}
                  />
                  Family history of diabetes
                </label>
              </div>
            </div>
          )}

          <div className={cn('flex items-center justify-between pt-2', step === 0 && 'justify-end')}>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Get results
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
    </>
  );
}
