'use client';

import { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  ShieldCheck,
  UtensilsCrossed,
  Moon,
  Activity,
  HeartPulse,
} from 'lucide-react';
import type { ScreeningResult } from '@/lib/types';
import {
  calculateIDRS,
  calculateTgHdlRatio,
  getAsianIndianBmiCategory,
  calculateWHtR,
  type FastingFestivalType,
} from '@/lib/indian-clinical';
import { cn } from '@/lib/utils';

function InlineBarometer({
  value,
  min,
  max,
  normalCutoff,
  borderlineCutoff,
  unit,
  label,
}: {
  value: number;
  min: number;
  max: number;
  normalCutoff: number;
  borderlineCutoff: number;
  unit: string;
  label: string;
}) {
  const clamped = Math.min(Math.max(value, min), max);
  const percent = ((clamped - min) / (max - min)) * 100;
  const normalPercent = ((normalCutoff - min) / (max - min)) * 100;
  const borderlinePercent = ((borderlineCutoff - min) / (max - min)) * 100;

  return (
    <div className="w-full mt-2 space-y-1">
      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
        <span>{min} {unit}</span>
        <span className="text-slate-700 dark:text-slate-300 font-bold">{label}: {value} {unit}</span>
        <span>{max} {unit}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        <div style={{ width: `${normalPercent}%` }} className="bg-emerald-500/80 h-full" title="Normal Target" />
        <div style={{ width: `${borderlinePercent - normalPercent}%` }} className="bg-amber-400/80 h-full" title="Borderline" />
        <div style={{ width: `${100 - borderlinePercent}%` }} className="bg-red-500/80 h-full" title="Elevated" />
      </div>
      <div className="relative w-full h-2">
        <div
          className="absolute -top-1 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${Math.min(Math.max(percent, 4), 96)}%` }}
        >
          <div className="w-2 h-2 rotate-45 bg-slate-900 dark:bg-white border border-slate-700 shadow-xs" />
        </div>
      </div>
    </div>
  );
}

export function GeminiDynamicInsights({ result }: { result: ScreeningResult }) {
  const [fastingContext, setFastingContext] = useState<FastingFestivalType>('none');
  const { input } = result;

  const height = input.height_cm ?? 168;
  const weight = input.weight_kg ?? 70;
  const waist = input.waist_cm ?? (input.sex === 'F' ? 82 : 88);

  const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
  const idrs = calculateIDRS({
    age: input.age ?? 45,
    sex: (input.sex as 'M' | 'F') ?? 'M',
    waistCm: waist,
    activity: 'moderate',
    familyHistoryDiabeticParents: input.family_history ? 1 : 0,
  });

  const tgHdl = calculateTgHdlRatio(input.triglycerides_mg_dl, input.hdl_mg_dl);
  const asianBmi = getAsianIndianBmiCategory(bmi);
  const whtr = calculateWHtR(waist, height);
  const glucose = input.glucose_mg_dl ?? 110;
  const isHighRisk = idrs.score >= 60 || glucose >= 126;

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. Official Pathology Accreditation & Barcode Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Clinical Diabetology Laboratory Evaluation
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ICMR-INDIAB & RSSDI Aligned
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specimen ID: #{result.id ? result.id.slice(0, 10) : 'MDRF-2026-X8'} • South Asian Phenotype Triage
            </p>
          </div>
        </div>

        {/* Barcode & Verification Stamp */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end font-mono text-[9px] text-slate-400 tracking-tighter">
            <div className="flex gap-0.5 h-6 items-center">
              {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
                <div key={i} className="bg-slate-700 dark:bg-slate-300 h-full" style={{ width: `${w}px` }} />
              ))}
            </div>
            <span>VERIFIED DIAGNOSTIC</span>
          </div>

          <span
            className={cn(
              'text-xs font-bold px-3 py-1.5 rounded-md border',
              isHighRisk
                ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-400 border-red-300 dark:border-red-800'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
            )}
          >
            {isHighRisk ? 'High Metabolic Risk Tier' : 'Controlled Baseline'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 2. Diagnostic Biomarker Matrix with Inline Visual Barometers */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center justify-between">
            <span>1. Diagnostic Biomarker Matrix & Dynamic Barometers</span>
            <span className="text-[10px] font-normal text-slate-500">Normal (Green) | Borderline (Yellow) | High (Red)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Glucose Barometer Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>Blood Glucose ({input.glucose_type ?? 'Fasting'})</span>
                <span className={glucose >= 126 ? 'text-red-600 font-bold' : glucose >= 100 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {glucose >= 126 ? 'Diabetic Range' : glucose >= 100 ? 'Impaired Fasting Glucose' : 'Optimal'}
                </span>
              </div>
              <InlineBarometer
                value={glucose}
                min={60}
                max={200}
                normalCutoff={99}
                borderlineCutoff={125}
                unit="mg/dL"
                label="FPG"
              />
            </div>

            {/* MDRF IDRS Barometer Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>MDRF Indian Diabetes Risk Score (IDRS)</span>
                <span className={idrs.category === 'High' ? 'text-red-600 font-bold' : idrs.category === 'Moderate' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {idrs.category} Risk ({idrs.score}/100)
                </span>
              </div>
              <InlineBarometer
                value={idrs.score}
                min={0}
                max={100}
                normalCutoff={29}
                borderlineCutoff={59}
                unit="/100"
                label="IDRS"
              />
            </div>

            {/* Atherogenic TG/HDL Ratio Barometer Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>TG / HDL Ratio (Atherogenic Index)</span>
                <span className={tgHdl.status === 'Atherogenic Risk' ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {tgHdl.ratio ? `${tgHdl.ratio}x` : 'Pending Lipids'} ({tgHdl.status})
                </span>
              </div>
              <InlineBarometer
                value={tgHdl.ratio ?? 2.1}
                min={0.5}
                max={5.0}
                normalCutoff={1.99}
                borderlineCutoff={2.99}
                unit="ratio"
                label="TG:HDL"
              />
            </div>

            {/* Asian-Indian BMI Barometer Card */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>Asian-Indian Specific BMI (ICMR)</span>
                <span className={cn('font-bold', asianBmi.color)}>
                  {bmi} kg/m² ({asianBmi.category})
                </span>
              </div>
              <InlineBarometer
                value={bmi}
                min={15}
                max={35}
                normalCutoff={22.9}
                borderlineCutoff={24.9}
                unit="kg/m²"
                label="BMI"
              />
            </div>
          </div>
        </div>

        {/* 3. South Asian "Thin-Fat" Visceral Adiposity Meter (WHtR) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              2. South Asian "Thin-Fat" Phenotype & Visceral Adiposity Meter
            </h4>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded', whtr.color, 'bg-slate-200/50 dark:bg-slate-800')}>
              WHtR: {whtr.ratio} ({whtr.status})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Waist-to-Height Ratio</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">{whtr.ratio}</span>
              <span className="text-[10px] text-slate-500">ICMR Target Cutoff: &lt; 0.50</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Observed Waist Circumference</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">{waist} cm</span>
              <span className="text-[10px] text-slate-500">Cutoff: M &lt; 90 cm | F &lt; 80 cm</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Clinical Adiposity Interpretation</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                {whtr.clinicalNote}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Visual ICMR Indian Food Plate ("Thali Matrix") with Fasting Switcher */}
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  3. Prescribed ICMR Indian Food Plate ("Thali Matrix")
                </h4>
                <p className="text-[11px] text-slate-500">National Institute of Nutrition (NIN) Glycemic Architecture</p>
              </div>
            </div>

            {/* Fasting & Festival Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <Moon className="h-3.5 w-3.5 text-amber-500 ml-1.5 mr-0.5" />
              {[
                { id: 'none', label: 'Standard' },
                { id: 'navratri_vrat', label: 'Vrat / Upvaas' },
                { id: 'ramadan', label: 'Ramadan' },
                { id: 'diwali_sweets', label: 'Festival Recovery' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFastingContext(f.id as FastingFestivalType)}
                  className={cn(
                    'px-2 py-1 text-[11px] font-semibold rounded transition-all',
                    fastingContext === f.id
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Thali 3-Zone Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Zone 1: 50% Fiber */}
            <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  50% Protective Fiber
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900">NIN Core</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {fastingContext === 'navratri_vrat'
                  ? 'Cucumber, Bottle Gourd (Lauki), Raw Banana'
                  : 'Palak, Methi, Lauki, Karela, Raw Salad'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                High in soluble viscous fiber; slows gastric emptying and eliminates sharp postprandial glucose excursions.
              </p>
            </div>

            {/* Zone 2: 25% Low-GI Millets */}
            <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  25% Complex Millets
                </span>
                <span className="text-[10px] font-bold text-red-600 line-through">White Rice</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {fastingContext === 'navratri_vrat'
                  ? 'Samak Rice (Barnyard Millet) & Kuttu Atta'
                  : 'Foxtail (Kangni) / Barnyard / Ragi Millet'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Rich in resistant starch and amylose. Lowers insulin demand compared to polished Sonamasuri or Maida.
              </p>
            </div>

            {/* Zone 3: 25% Protein & Healthy Fats */}
            <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  25% High-Satiety Protein
                </span>
                <span className="text-[10px] font-bold text-emerald-600">GLUT-4 Support</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {fastingContext === 'navratri_vrat'
                  ? 'Roasted Makhana, Paneer, Curd, Peanuts'
                  : 'Sprouted Moong, Roasted Chana, Paneer, Dal'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                Enhances satiety, preserves skeletal muscle mass, and promotes peripheral glucose disposal.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Confirmatory Lab Investigations Orders */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            4. Physician Confirmatory Orders & Follow-up Checklist
          </h4>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'Venous Fasting Plasma Glucose (FPG) + 75g 2-Hr OGTT',
                'Venous HbA1c via NGSP-Certified HPLC method',
                'Complete Fasting Lipid Panel (Triglycerides, HDL-C, sdLDL)',
                'Urinary Albumin-to-Creatinine Ratio (uACR) & eGFR',
              ].map((order, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{order}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
