'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Languages,
  Moon,
  Salad,
  ShieldCheck,
  Stethoscope,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { ScreeningResult } from '@/lib/types';
import {
  calculateIDRS,
  calculateTgHdlRatio,
  getAsianIndianBmiCategory,
  type FastingFestivalType,
} from '@/lib/indian-clinical';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
];

export function GeminiDynamicInsights({ result }: { result: ScreeningResult }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [fastingMode, setFastingMode] = useState<FastingFestivalType>('none');

  const { input } = result;
  const bmi =
    input.height_cm && input.weight_kg
      ? parseFloat((input.weight_kg / Math.pow(input.height_cm / 100, 2)).toFixed(1))
      : 24.0;

  const idrs = calculateIDRS({
    age: input.age ?? 45,
    sex: (input.sex as 'M' | 'F') ?? 'M',
    activity: 'moderate',
    familyHistoryDiabeticParents: input.family_history ? 1 : 0,
  });

  const tgHdl = calculateTgHdlRatio(input.triglycerides_mg_dl, input.hdl_mg_dl);
  const asianBmi = getAsianIndianBmiCategory(bmi);

  useEffect(() => {
    fetchIndianSynthesis();
  }, [result, selectedLang, fastingMode]);

  async function fetchIndianSynthesis() {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientProfile: {
            glucose: input.glucose_mg_dl,
            glucoseType: input.glucose_type,
            sbp: input.sbp,
            dbp: input.dbp,
            bmi,
            age: input.age,
            sex: input.sex,
            familyHistory: input.family_history,
          },
          language: selectedLang,
          fastingMode,
          idrsScore: idrs.score,
          tgHdlRatio: tgHdl.ratio,
        }),
      });

      const response = await res.json();
      if (response.ok && response.data) {
        setData(response.data);
      }
    } catch {
      // Graceful silence
    } finally {
      setLoading(false);
    }
  }

  function toggleSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!data?.executiveSummary) return;
    const utterance = new SpeechSynthesisUtterance(data.executiveSummary);
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden rounded-2xl">
      <CardHeader className="p-4 sm:p-5 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0 font-bold">
              <Stethoscope className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Indian Metabolic Intelligence
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" /> ICMR & RSSDI Guidelines
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calibrated to South Asian visceral adiposity and insulin kinetics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
            <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg font-medium transition-all',
                  selectedLang === lang.code
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">MDRF IDRS Score</span>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', idrs.color)}>
                {idrs.category} Risk
              </Badge>
            </div>
            <div className="text-xl font-bold text-foreground">
              {idrs.score} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">{idrs.recommendation}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">TG / HDL Ratio</span>
              <span className="text-[10px] font-semibold text-foreground">
                {tgHdl.ratio ? `${tgHdl.ratio}x` : 'Pending Lipids'}
              </span>
            </div>
            <div className="text-sm font-semibold text-foreground">{tgHdl.status}</div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {tgHdl.clinicalInterpretation}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/30 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Asian Indian BMI</span>
              <span className="text-xs font-bold text-foreground">{bmi} kg/m²</span>
            </div>
            <div className={cn('text-sm font-semibold', asianBmi.color)}>{asianBmi.category}</div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              ICMR cutoffs: Overweight ≥ 23, Obese ≥ 25
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">Fasting & Festival Mode:</span>
          </div>
          <div className="flex gap-1">
            {[
              { id: 'none', label: 'Standard' },
              { id: 'navratri_vrat', label: 'Vrat / Upvaas' },
              { id: 'ramadan', label: 'Ramadan' },
              { id: 'diwali_sweets', label: 'Festival Sweets' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFastingMode(f.id as FastingFestivalType)}
                className={cn(
                  'px-2 py-1 text-[11px] rounded-lg font-medium transition-all',
                  fastingMode === f.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-16 bg-muted/60 rounded-xl" />
            <div className="h-28 bg-muted/40 rounded-xl" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Executive Clinical Triage
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSpeech}
                  className="h-7 text-xs gap-1 font-medium text-primary hover:text-primary"
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5 text-red-500" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {isSpeaking ? 'Stop' : 'Listen'}
                </Button>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {data.executiveSummary}
              </p>
              {data.festivalFastingAdvice && fastingMode !== 'none' && (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mt-2">
                  <strong>Fasting Notice:</strong> {data.festivalFastingAdvice}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Salad className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Prescribed Indian Dietary Interventions
                </span>
                <span className="text-[10px] text-muted-foreground">Glycemic-Indexed Swaps</span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                {data.dietarySwaps?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/80 bg-card p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide block">
                        Limit
                      </span>
                      <p className="text-xs font-medium text-foreground line-through decoration-red-400/60">
                        {item.staple}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-border/40">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> Adopt
                      </span>
                      <p className="text-xs font-semibold text-foreground">{item.swap}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {item.clinicalReason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-amber-500" /> Target Macronutrient Balance
                </span>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Carbs: </span>
                    {data.macronutrientTargets?.carbohydrates}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Protein: </span>
                    {data.macronutrientTargets?.protein}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Healthy Fats: </span>
                    {data.macronutrientTargets?.fats}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-500" />
                  Recommended Physician Lab Orders
                </span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {data.confirmatoryTests?.map((test: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
