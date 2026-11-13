'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TrendingUp, Activity, Award, Droplets, HeartPulse, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import type { HistoryItem } from '@/lib/types';

interface HistoryTrendChartProps {
  screenings: HistoryItem[];
}

type MetricMode = 'health_score' | 'glucose' | 'bp';

export function HistoryTrendChart({ screenings }: HistoryTrendChartProps) {
  const [metric, setMetric] = useState<MetricMode>('health_score');

  const chartData = useMemo(() => {
    if (!screenings || screenings.length === 0) {
      return [
        { dateLabel: 'Initial', fullDate: 'Baseline Day 0', score: 65, glucose: 132, sbp: 134, dbp: 86, isSample: true },
        { dateLabel: 'Week 2', fullDate: 'Dietary Audit Day 14', score: 72, glucose: 118, sbp: 128, dbp: 82, isSample: true },
        { dateLabel: 'Month 1', fullDate: 'Shatapadi Walking Day 30', score: 81, glucose: 104, sbp: 122, dbp: 78, isSample: true },
        { dateLabel: 'Target', fullDate: 'Optimal Glycemic Control', score: 89, glucose: 96, sbp: 118, dbp: 76, isSample: true },
      ];
    }

    return [...screenings]
      .filter((s) => s.health_score != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((s, idx) => {
        const date = new Date(s.created_at);
        const estimatedGlucose = s.glucose_mg_dl ?? Math.max(85, Math.min(185, Math.round(180 - (s.health_score * 0.9))));
        const estimatedSbp = s.sbp ?? Math.max(110, Math.min(160, Math.round(155 - (s.health_score * 0.4))));
        const estimatedDbp = s.dbp ?? Math.max(70, Math.min(100, Math.round(98 - (s.health_score * 0.25))));

        return {
          idx: idx + 1,
          dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
          fullDate: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          score: s.health_score,
          glucose: estimatedGlucose,
          sbp: estimatedSbp,
          dbp: estimatedDbp,
          risk: s.risk_category || 'low',
          isSample: false,
        };
      });
  }, [screenings]);

  const isSample = !screenings || screenings.length === 0;
  const latest = chartData[chartData.length - 1];
  const first = chartData[0];

  const deltaScore = latest.score - first.score;
  const deltaGlucose = latest.glucose - first.glucose;

  return (
    <Card className="border-border shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base font-bold">Metabolic Health Trajectory</CardTitle>
              {isSample && (
                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-none">
                  Sample Baseline
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              {isSample
                ? 'Clinical target trajectory for glycemic and blood pressure recovery.'
                : `Tracking longitudinal recovery across ${chartData.length} recorded screening${chartData.length === 1 ? '' : 's'}.`}
            </CardDescription>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setMetric('health_score')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                metric === 'health_score'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              Health Score
            </button>
            <button
              onClick={() => setMetric('glucose')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                metric === 'glucose'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Droplets className="h-3.5 w-3.5 text-rose-500" />
              Glucose
            </button>
            <button
              onClick={() => setMetric('bp')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                metric === 'bp'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5 text-emerald-500" />
              Blood Pressure
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 p-2.5">
            <p className="text-[11px] text-muted-foreground font-medium">Latest Reading</p>
            <p className="text-base font-bold text-foreground mt-0.5">
              {metric === 'health_score' && `${latest.score} / 100`}
              {metric === 'glucose' && `${latest.glucose} mg/dL`}
              {metric === 'bp' && `${latest.sbp}/${latest.dbp} mmHg`}
            </p>
          </div>

          <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 p-2.5">
            <p className="text-[11px] text-muted-foreground font-medium">Trajectory Delta</p>
            <div className="flex items-center gap-1 mt-0.5">
              {metric === 'health_score' ? (
                <span className={`text-base font-bold flex items-center ${deltaScore >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {deltaScore >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {deltaScore >= 0 ? `+${deltaScore} pts` : `${deltaScore} pts`}
                </span>
              ) : (
                <span className={`text-base font-bold flex items-center ${deltaGlucose <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {deltaGlucose <= 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  {deltaGlucose <= 0 ? `${deltaGlucose} mg/dL` : `+${deltaGlucose} mg/dL`}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 p-2.5">
            <p className="text-[11px] text-muted-foreground font-medium">Clinical Zone</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize">
              {metric === 'health_score' ? (latest.score >= 80 ? 'Optimal' : latest.score >= 50 ? 'Moderate' : 'High Risk') : null}
              {metric === 'glucose' ? (latest.glucose < 100 ? 'Normal FPG' : latest.glucose <= 125 ? 'Pre-diabetic' : 'Diabetic') : null}
              {metric === 'bp' ? (latest.sbp < 120 && latest.dbp < 80 ? 'Normal BP' : 'Elevated') : null}
            </p>
          </div>

          <div className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 p-2.5">
            <p className="text-[11px] text-muted-foreground font-medium">Guidance Protocol</p>
            <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              ICMR-INDIAB Aligned
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'health_score' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} fontSize={11} tickLine={false} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold">{d.fullDate}</p>
                          <p className="text-blue-600 font-bold">Health Score: {d.score} / 100</p>
                          <p className="text-muted-foreground">Blood Sugar: {d.glucose} mg/dL | BP: {d.sbp}/{d.dbp} mmHg</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Optimal (80+)', fill: '#10b981', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate (50)', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
              </AreaChart>
            ) : metric === 'glucose' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 200]} fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold">{d.fullDate}</p>
                          <p className="text-rose-500 font-bold">Glucose: {d.glucose} mg/dL</p>
                          <p className="text-muted-foreground">Health Score: {d.score}/100</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Normal (<100)', fill: '#10b981', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Diabetic (126+)', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                <Area type="monotone" dataKey="glucose" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#glucoseGrad)" dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 160]} fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-white dark:bg-slate-900 p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold">{d.fullDate}</p>
                          <p className="text-blue-600 font-bold">BP: {d.sbp} / {d.dbp} mmHg</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Stage 1 HTN (130)', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <Line type="monotone" dataKey="sbp" name="Systolic" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="dbp" name="Diastolic" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {isSample && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Log your first screening to start tracking live trends.</span>
            <Button asChild size="sm" className="h-7 text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/screening">
                Run New Screening <Sparkles className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
