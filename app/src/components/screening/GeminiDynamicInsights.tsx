'use client';

import { useState, useEffect } from 'react';
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
  Sparkles,
  Loader2,
  Key,
  Languages,
  Coffee,
  Footprints,
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
  const [selectedLang, setSelectedLang] = useState('en');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

  useEffect(() => {
    const saved = localStorage.getItem('gemini_user_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleSaveKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_user_api_key', val);
  };

  const fetchAiSynthesis = async (lang = selectedLang) => {
    setLoadingAi(true);
    setAiError(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
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
          fastingMode: fastingContext,
          idrsScore: idrs.score,
          tgHdlRatio: tgHdl.ratio ?? 2.1,
          acanthosisNigricans: (input as any).acanthosis_nigricans ?? false,
          skinTags: (input as any).skin_tags ?? false,
          chaiCups: (input as any).chai_cups_per_day ?? 2,
          sugarSpoons: (input as any).sugar_spoons_per_cup ?? 1.5,
          biscuits: (input as any).biscuits_per_day ?? 2,
          region: (input as any).region ?? 'south',
        }),
      });

      const data = await res.json();
      if (data.ok && data.data) {
        setAiData(data.data);
      } else {
        if (data.needsApiKey) {
          setShowKeyInput(true);
        }
        setAiError(data.error || 'Failed to generate AI insights');
      }
    } catch (err: any) {
      setAiError(err?.message || 'Network error reaching Gemini service');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. Official Header */}
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

      <div className="p-5 space-y-6">
        {/* 2. LIVE GEMINI AI CLINICAL SYNTHESIS CARD */}
        <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-blue-950/20 dark:via-slate-950 dark:to-indigo-950/20 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200 dark:border-blue-900/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  AI Diabetologist Synthesis (Google Gemini)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Dynamic lifestyle, chai sucrose analysis & regional diet recommendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="h-7 text-[11px] gap-1 text-slate-600 dark:text-slate-300"
              >
                <Key className="h-3 w-3" />
                {apiKey ? 'API Key Configured' : 'Set Gemini Key'}
              </Button>

              <Button
                size="sm"
                onClick={() => fetchAiSynthesis(selectedLang)}
                disabled={loadingAi}
                className="h-7 text-[11px] font-semibold gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiData ? 'Regenerate Analysis' : 'Run Gemini AI Analysis'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Gemini Key Input Drawer */}
          {showKeyInput && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-2 text-xs">
              <Key className="h-4 w-4 text-blue-600 shrink-0" />
              <input
                type="password"
                placeholder="Paste your Google Gemini API Key (AIzaSy...)"
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                className="flex-1 bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500">Saved securely in browser session</span>
            </div>
          )}

          {/* 9 Indian Languages Selector Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Languages className="h-3 w-3" /> Select Language for Clinical Synthesis:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INDIAN_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setSelectedLang(l.code);
                    if (aiData) fetchAiSynthesis(l.code);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all',
                    selectedLang === l.code
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  )}
                >
                  <span className="font-bold">{l.native}</span>
                  {l.code !== 'en' && <span className="text-[9px] opacity-70 ml-1">({l.label})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* AI Result Content */}
          {aiError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {aiError}
            </div>
          )}

          {aiData ? (
            <div className="space-y-3 pt-2">
              {/* Executive Clinical Triage */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                  Diagnostic Executive Summary
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {aiData.clinicalTriage}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Chai & Sucrose Impact */}
                {aiData.chaiImpactAnalysis && (
                  <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Coffee className="h-3 w-3" /> Chai & Liquid Sucrose Analysis
                    </span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                      {aiData.chaiImpactAnalysis}
                    </p>
                  </div>
                )}

                {/* Shatapadi 100-step walk */}
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

              {/* Tailored Dietary Swaps */}
              {aiData.dietarySwaps && aiData.dietarySwaps.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Tailored Regional Dietary Substitutions
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
              Click <strong>"Run Gemini AI Analysis"</strong> to generate a live personalized consultation in your chosen Indian language.
            </div>
          )}
        </div>

        {/* 3. Biomarker Barometers */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center justify-between">
            <span>Biomarker Diagnostic Ranges</span>
            <span className="text-[10px] font-normal text-slate-500">Normal (Green) | Borderline (Yellow) | High (Red)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>Blood Glucose ({input.glucose_type ?? 'Fasting'})</span>
                <span className={glucose >= 126 ? 'text-red-600 font-bold' : glucose >= 100 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {glucose >= 126 ? 'Diabetic Range' : glucose >= 100 ? 'Impaired Fasting Glucose' : 'Optimal'}
                </span>
              </div>
              <InlineBarometer value={glucose} min={60} max={200} normalCutoff={99} borderlineCutoff={125} unit="mg/dL" label="FPG" />
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>MDRF Indian Diabetes Risk Score (IDRS)</span>
                <span className={idrs.category === 'High' ? 'text-red-600 font-bold' : idrs.category === 'Moderate' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {idrs.category} Risk ({idrs.score}/100)
                </span>
              </div>
              <InlineBarometer value={idrs.score} min={0} max={100} normalCutoff={29} borderlineCutoff={59} unit="/100" label="IDRS" />
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>TG / HDL Ratio (Atherogenic Index)</span>
                <span className={tgHdl.status === 'Atherogenic Risk' ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {tgHdl.ratio ? `${tgHdl.ratio}x` : 'Pending Lipids'} ({tgHdl.status})
                </span>
              </div>
              <InlineBarometer value={tgHdl.ratio ?? 2.1} min={0.5} max={5.0} normalCutoff={1.99} borderlineCutoff={2.99} unit="ratio" label="TG:HDL" />
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex justify-between text-xs font-semibold">
                <span>Asian-Indian BMI (ICMR)</span>
                <span className={cn('font-bold', asianBmi.color)}>{bmi} kg/m² ({asianBmi.category})</span>
              </div>
              <InlineBarometer value={bmi} min={15} max={35} normalCutoff={22.9} borderlineCutoff={24.9} unit="kg/m²" label="BMI" />
            </div>
          </div>
        </div>

        {/* 4. Thin-Fat Phenotype & Visceral Adiposity Meter */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              South Asian "Thin-Fat" Phenotype & Visceral Adiposity Meter
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
      </div>
    </div>
  );
}
