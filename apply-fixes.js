const fs = require('fs');
const path = require('path');

// 1. Update types.ts with vital types for HistoryItem
const typesPath = path.join('app', 'src', 'lib', 'types.ts');
let typesCode = fs.readFileSync(typesPath, 'utf8').replace(/^\uFEFF/, '');
if (!typesCode.includes('glucose_mg_dl?: number;')) {
  typesCode = typesCode.replace(
    'export interface HistoryItem {',
    'export interface HistoryItem {\n  glucose_mg_dl?: number;\n  sbp?: number;\n  dbp?: number;'
  );
  fs.writeFileSync(typesPath, typesCode, 'utf8');
  console.log('✓ Updated types.ts');
}

// 2. Fix HistoryTable.tsx syntax closing tags
const historyTablePath = path.join('app', 'src', 'components', 'history', 'HistoryTable.tsx');
const historyTableCode = `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stethoscope, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { RiskBadge } from '@/components/screening/RiskBadge';
import { HistoryTrendChart } from '@/components/history/HistoryTrendChart';
import { DoctorPatientMonitor } from '@/components/doctor/DoctorPatientMonitor';
import { useHistory } from '@/hooks/useHistory';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

export function HistoryTable() {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');
  const [risk, setRisk] = useState<string>('all');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useHistory({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    risk_category: risk === 'all' ? undefined : risk,
  });

  const total = data?.total ?? 0;
  const rows = data?.screenings ?? [];
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="space-y-5">
      {/* Tab Switcher: Patient History vs Doctor Clinical Monitor */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border text-xs">
          <button
            onClick={() => setActiveTab('patient')}
            className={\`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 \${
              activeTab === 'patient'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }\`}
          >
            <User className="h-3.5 w-3.5 text-blue-600" />
            My Screening History & Graph
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={\`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 \${
              activeTab === 'doctor'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }\`}
          >
            <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
            Doctor Clinical Monitor
          </button>
        </div>
      </div>

      {activeTab === 'doctor' ? (
        <DoctorPatientMonitor />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : \`\${total} screening\${total === 1 ? '' : 's'}\`}
            </p>
            <div className="w-48">
              <Select
                value={risk}
                onValueChange={(v) => {
                  setRisk(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError && (
            <Alert variant="warning">
              <AlertDescription>Could not load history. Showing nothing.</AlertDescription>
            </Alert>
          )}

          {/* Longitudinal Risk Progression Chart */}
          {!isLoading && (
            <HistoryTrendChart screenings={rows} />
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No screenings yet.{' '}
                <Link href="/screening" className="text-primary underline">
                  Run your first screening
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rows.map((row) =>
                row.pending ? (
                  <Card key={row.id} className="border-dashed">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Waiting to sync from this device
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Pending sync
                      </span>
                    </CardContent>
                  </Card>
                ) : (
                  <Link key={row.id} href={\`/history/\${row.id}\`} className="block">
                    <Card className={cn('transition-colors hover:bg-accent/50')}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {new Date(row.created_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">ID {row.id.slice(0, 8)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-semibold tabular-nums">
                            {row.health_score}
                            <span className="text-xs text-muted-foreground">/100</span>
                          </span>
                          <RiskBadge category={row.risk_category} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              )}
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {maxPage + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync(historyTablePath, historyTableCode, 'utf8');
console.log('✓ Cleaned HistoryTable.tsx');

// 3. Update ScreeningWizard.tsx to hide presets by default and add Demo Simulation Mode toggle button
const screeningPath = path.join('app', 'src', 'components', 'screening', 'ScreeningWizard.tsx');
let wizardCode = fs.readFileSync(screeningPath, 'utf8').replace(/^\uFEFF/, '');

// Add the Demo Simulation button in the header if not present
if (!wizardCode.includes('Demo Simulation Mode')) {
  wizardCode = wizardCode.replace(
    '<ClipboardPaste className="h-3.5 w-3.5" /> Paste / Import Lab Report\n            </Button>',
    '<ClipboardPaste className="h-3.5 w-3.5" /> Paste / Import Lab Report\n            </Button>\n            <Button\n              type="button"\n              variant="outline"\n              size="sm"\n              className={cn("h-8 text-xs gap-1.5 border-dashed", showDemoPresets ? "border-amber-500 text-amber-600 bg-amber-500/10" : "text-muted-foreground")}\n              onClick={() => setShowDemoPresets((v) => !v)}\n            >\n              <FlaskConical className="h-3.5 w-3.5 text-amber-600" /> {showDemoPresets ? "Hide Demo Presets" : "Demo Simulation Mode"}\n            </Button>'
  );
}

// Ensure the presets section only renders when showDemoPresets is true
const oldPresetsRegex = /{\/\* Quick Clinical Presets[\s\S]*?{\/\* Step 1: Glucose \*\//;
const newPresetsBlock = `{/* Quick Clinical Presets - ONLY visible when Demo Mode is explicitly toggled ON */}
          {showDemoPresets && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <FlaskConical className="h-3.5 w-3.5" /> Demo Simulation Mode (Sample Profiles)
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setShowDemoPresets(false)}>
                  Hide Presets
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                One-click clinical test cases for demonstrations. Real patients can enter actual lab vitals below.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs bg-background" onClick={() => loadPreset('healthy')}>
                  🟢 Healthy Baseline
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs bg-background" onClick={() => loadPreset('prediabetes')}>
                  🟡 Prediabetes Risk
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs bg-background" onClick={() => loadPreset('highRisk')}>
                  🔴 High Risk Case
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs bg-background" onClick={() => loadPreset('hba1cCase')}>
                  🟣 HbA1c Case (7.2%)
                </Button>
              </div>
            </div>
          )}

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
            {/* Step 1: Glucose */`;

if (oldPresetsRegex.test(wizardCode)) {
  wizardCode = wizardCode.replace(oldPresetsRegex, newPresetsBlock);
  fs.writeFileSync(screeningPath, wizardCode, 'utf8');
  console.log('✓ Updated ScreeningWizard.tsx with clean Demo Simulation Mode');
}

console.log('Done! Ready to commit and push.');
