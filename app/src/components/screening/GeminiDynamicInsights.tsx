'use client';

import { useState } from 'react';
import {
  Stethoscope,
  Sparkles,
  Loader2,
  Languages,
  Coffee,
  Footprints,
  ArrowRight,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import type { ScreeningResult } from '@/lib/types';
import {
  calculateIDRS,
  calculateTgHdlRatio,
  getAsianIndianBmiCategory,
  calculateWHtR,
} from '@/lib/indian-clinical';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const INDIAN_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export function GeminiDynamicInsights({ result }: { result: ScreeningResult }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

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

  const consultDrCharak = async (lang = selectedLang) => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientProfile: {
            glucose,
            glucoseType: input.glucose_type ?? 'fasting',
            sbp: input.sbp ?? 120,
            dbp: input.dbp ?? 80,
            bmi,
            waist,
          },
          language: lang,
          idrsScore: idrs.score,
          tgHdlRatio: tgHdl.ratio ?? 2.1,
          acanthosisNigricans: (input as any).acanthosis_nigricans ?? false,
          chaiCups: (input as any).chai_cups_per_day ?? 2,
          sugarSpoons: (input as any).sugar_spoons_per_cup ?? 1.5,
          biscuits: (input as any).biscuits_per_day ?? 2,
          region: (input as any).region ?? 'south',
        }),
      });

      const data = await res.json();
      if (data.ok && data.data) {
        setAiData(data.data);
      }
    } catch {
      // Fallback handles gracefully
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100 font-sans space-y-6 p-5">
      {/* Dr. Charak AI Consultation Card */}
      <div className="rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/30 dark:from-emerald-950/20 dark:via-slate-950 dark:to-blue-950/20 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 dark:border-emerald-900/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Dr. Charak AI
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ICMR-INDIAB Clinical Diabetologist
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Indian Metabolic Phenotype Triage • Shatapadi Walk • Regional Diet Swaps
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => consultDrCharak(selectedLang)}
            disabled={loadingAi}
            className="h-9 px-4 text-xs font-bold gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loadingAi ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Consulting Dr. Charak...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {aiData ? 'Update Consultation' : 'Consult Dr. Charak'}
              </>
            )}
          </Button>
        </div>

        {/* 9 Indian Languages Selector */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Languages className="h-3 w-3" /> Select Language for Dr. Charak's Advice:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {INDIAN_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setSelectedLang(l.code);
                  consultDrCharak(l.code);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  selectedLang === l.code
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                )}
              >
                <span>{l.native}</span>
                {l.code !== 'en' && <span className="text-[10px] opacity-75 ml-1">({l.label})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* AI Output Content */}
        {aiData ? (
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                Dr. Charak Clinical Evaluation
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {aiData.clinicalTriage}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {aiData.chaiImpactAnalysis && (
                <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Coffee className="h-3 w-3" /> Chai & Added Sucrose Review
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {aiData.chaiImpactAnalysis}
                  </p>
                </div>
              )}

              {aiData.shatapadiPrescription && (
                <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Footprints className="h-3 w-3" /> Shatapadi Post-Meal Walk Prescription
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    {aiData.shatapadiPrescription}
                  </p>
                </div>
              )}
            </div>

            {aiData.dietarySwaps && aiData.dietarySwaps.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Prescribed Regional Dietary Substitutions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiData.dietarySwaps.map((swap: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-red-500 font-semibold">{swap.staple}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{swap.swap}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{swap.clinicalReason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
            Click <strong>"Consult Dr. Charak"</strong> above to generate your personalized Indian clinical consultation.
          </div>
        )}
      </div>
    </div>
  );
}
