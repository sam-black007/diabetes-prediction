'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { TrendingUp, Activity, Award } from 'lucide-react';
import type { HistoryItem } from '@/lib/types';

interface HistoryTrendChartProps {
  screenings: HistoryItem[];
}

export function HistoryTrendChart({ screenings }: HistoryTrendChartProps) {
  const chartData = useMemo(() => {
    // Sort chronological (oldest to newest)
    return [...screenings]
      .filter((s) => s.health_score != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((s, idx) => {
        const date = new Date(s.created_at);
        return {
          idx: idx + 1,
          dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
          fullDate: date.toLocaleDateString(),
          score: s.health_score,
          risk: s.risk_category,
        };
      });
  }, [screenings]);

  if (chartData.length < 2) {
    return null; // Only show progression graph when at least 2 historical screenings exist
  }

  const latestScore = chartData[chartData.length - 1].score;
  const firstScore = chartData[0].score;
  const delta = latestScore - firstScore;
  const avgScore = Math.round(
    chartData.reduce((acc, curr) => acc + curr.score, 0) / chartData.length
  );

  return (
    <Card className="border-border bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Longitudinal Risk Progression</CardTitle>
            </div>
            <CardDescription>
              Tracking health score trajectory across your last {chartData.length} screenings.
            </CardDescription>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <span className="text-muted-foreground">Average: </span>
                <span className="font-bold">{avgScore}/100</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs">
              <Award className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="text-muted-foreground">Trajectory: </span>
                <span
                  className={
                    delta > 0
                      ? 'font-bold text-emerald-600'
                      : delta < 0
                      ? 'font-bold text-destructive'
                      : 'font-bold'
                  }
                >
                  {delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dateLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                        <p className="font-semibold">{data.fullDate}</p>
                        <p className="text-primary font-bold">Health Score: {data.score} / 100</p>
                        <p className="capitalize text-muted-foreground">Risk: {data.risk}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Optimal', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGradient)"
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
