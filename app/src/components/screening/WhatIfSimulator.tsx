'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sliders, Sparkles, TrendingDown, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import type { ScreeningResult, ScreeningInput } from '@/lib/types';

interface WhatIfSimulatorProps {
  result: ScreeningResult;
}

export function WhatIfSimulator({ result }: WhatIfSimulatorProps) {
  const initialInput = result.input;

  const initialGlucose = initialInput?.glucose_mg_dl ?? 120;
  const initialWeight = initialInput?.weight_kg ?? 80;
  const initialHeight = initialInput?.height_cm ?? 175;
  const initialSbp = initialInput?.sbp ?? 130;

  const [glucose, setGlucose] = useState<number>(initialGlucose);
  const [weight, setWeight] = useState<number>(initialWeight);
  const [sbp, setSbp] = useState<number>(initialSbp);

  // Calculate baseline BMI
  const heightM = initialHeight / 100;
  const simBmi = useMemo(() => {
    return heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 25;
  }, [weight, heightM]);

  // Compute simulated health score (0-100)
  const simulatedScore = useMemo(() => {
    let score = 100;

    // Glucose penalty
    if (glucose >= 200) score -= 45;
    else if (glucose >= 126) score -= 30;
    else if (glucose >= 100) score -= 15;
    else if (glucose < 70) score -= 20;

    // SBP penalty
    if (sbp >= 140) score -= 25;
    else if (sbp >= 130) score -= 15;
    else if (sbp >= 120) score -= 8;

    // BMI penalty
    if (simBmi >= 35) score -= 25;
    else if (simBmi >= 30) score -= 18;
    else if (simBmi >= 25) score -= 8;

    return Math.max(10, Math.min(100, score));
  }, [glucose, sbp, simBmi]);

  const originalScore = result.health_score;
  const scoreDiff = simulatedScore - originalScore;

  function resetToOriginal() {
    setGlucose(initialGlucose);
    setWeight(initialWeight);
    setSbp(initialSbp);
  }

  function applyPreset(preset: 'optimal' | 'moderate' | 'weightLoss') {
    if (preset === 'optimal') {
      setGlucose(92);
      setSbp(118);
      setWeight(Math.round(22.5 * (heightM * heightM)));
    } else if (preset === 'moderate') {
      setGlucose(Math.max(98, initialGlucose - 15));
      setSbp(Math.max(122, initialSbp - 10));
      setWeight(Math.max(60, initialWeight - 4));
    } else if (preset === 'weightLoss') {
      setWeight(Math.round(initialWeight * 0.93)); // 7% weight loss (ADA benchmark)
      setGlucose(Math.max(95, initialGlucose - 12));
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Interactive Risk & Goal Simulator</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToOriginal} className="text-xs">
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
        <CardDescription>
          Simulate how lifestyle adjustments (weight loss, blood pressure, or glucose control) impact your health score in real-time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Goal Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Quick Goals:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset('weightLoss')}
          >
            📉 7% Weight Reduction (ADA)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset('moderate')}
          >
            🎯 Step-Down Control (-15 mg/dL)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset('optimal')}
          >
            ✨ Optimal Lifestyle Target
          </Button>
        </div>

        {/* Sliders Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Glucose Slider */}
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Fasting Glucose</span>
              <span className="font-bold text-primary">{glucose} mg/dL</span>
            </div>
            <input
              type="range"
              min={70}
              max={220}
              value={glucose}
              onChange={(e) => setGlucose(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>70 (Normal)</span>
              <span>100 (Prediabetes)</span>
              <span>126+ (High)</span>
            </div>
          </div>

          {/* Weight / BMI Slider */}
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Body Weight</span>
              <span className="font-bold text-primary">
                {weight} kg <span className="text-xs font-normal text-muted-foreground">(BMI {simBmi})</span>
              </span>
            </div>
            <input
              type="range"
              min={45}
              max={140}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Healthy BMI (&lt;25)</span>
              <span>Overweight (25-30)</span>
              <span>Obese (30+)</span>
            </div>
          </div>

          {/* Blood Pressure Slider */}
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Systolic Blood Pressure</span>
              <span className="font-bold text-primary">{sbp} mmHg</span>
            </div>
            <input
              type="range"
              min={90}
              max={180}
              value={sbp}
              onChange={(e) => setSbp(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>&lt;120 (Optimal)</span>
              <span>130 (Stage 1)</span>
              <span>140+ (Stage 2)</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Projection Banner */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs uppercase text-muted-foreground">Baseline Score</div>
              <div className="text-2xl font-bold">{originalScore}</div>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            <div className="text-center">
              <div className="text-xs uppercase text-primary font-semibold">Simulated Score</div>
              <div className="text-2xl font-bold text-primary">{simulatedScore}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scoreDiff > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingDown className="h-4 w-4" />
                +{scoreDiff} Health Score Improvement
              </div>
            ) : scoreDiff < 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
                {scoreDiff} Point Drop (Elevated Risk)
              </div>
            ) : (
              <div className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                Current baseline parameters
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
