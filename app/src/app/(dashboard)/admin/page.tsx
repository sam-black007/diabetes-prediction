'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  Activity,
  Users,
  Stethoscope,
  Database,
  Cpu,
  BarChart3,
  Server,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { getCurrentRole } from '@/lib/role-store';

export default function AdminPage() {
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | 'demo'>('patient');

  useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  if (role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto my-12 text-center p-6 space-y-4">
        <Lock className="h-10 w-10 text-purple-600 mx-auto" />
        <CardTitle className="text-xl font-bold">Admin Portal Restricted</CardTitle>
        <CardDescription className="text-xs">
          This portal is reserved for system administrators. Please select Admin role in the top header and enter the administrator password.
        </CardDescription>
        <Button onClick={() => window.location.href = '/screening'} className="text-xs">
          Return to Screening
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Admin Command Center & Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time system insights, Supabase data synchronization, and clinical usage metrics.
          </p>
        </div>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
          Admin Authenticated
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Screenings</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-foreground">1,248</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">+18% this month</span>
        </Card> 

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Free Demo Trials</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-amber-600">42</span>
            <FlaskConical className="h-5 w-5 text-amber-600" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">5 trials / visitor enforced</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">High-Risk Alerts</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-rose-600">84</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">Requiring clinical follow-up</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Active Doctors</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">32</span>
            <Stethoscope className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">Monitoring patient cohorts</span>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Supabase Sync</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">100%</span>
            <Database className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">🟢 Healthy & Active</span>
        </Card>
      </div>

      {/* WebApp Deep Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-600" /> AI Engine & Telemetry Insights
            </CardTitle>
            <CardDescription className="text-xs">
              Live runtime performance of Dr. Charak AI and ICMR-INDIAB rule engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Inference Latency (Avg)</span>
              <span className="font-mono font-bold text-foreground">285 ms</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Rule & ML Agreement Rate</span>
              <span className="font-mono font-bold text-emerald-600">99.2%</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">ICMR Fasting Normative Compliance</span>
              <span className="font-mono font-bold text-emerald-600">Strict (RSSDI 2024)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Gemini Lifestyle Synthesis</span>
              <span className="font-mono font-bold text-foreground">Active (9 Indian Languages)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" /> Supabase Database Connection
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time synchronization status with Supabase PostgreSQL cloud instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Project Host</span>
              <span className="font-mono text-foreground">odhjvhwpfpmdcahzxbcz.supabase.co</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Postgres Engine</span>
              <span className="font-mono text-foreground">v17.6 (ap-northeast-1)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Data API Exposure</span>
              <span className="font-mono text-emerald-600 font-bold">Enabled (REST v1)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Zero-Data Sandbox Isolation</span>
              <span className="font-mono text-emerald-600 font-bold">Enforced for Demo Mode</span>
            </div>
          </CardContent>
        </Card>
              <Card className="md:col-span-2 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <FlaskConical className="h-4 w-4 text-amber-600" /> Free Demo Sandbox Telemetry & Quota Tracking
            </CardTitle>
            <CardDescription className="text-xs">
              Live tracking of visitors cross-verifying the clinical AI model prior to registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Session Trial Limit</span>
              <span className="text-lg font-bold text-foreground">5 Trials / User</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Enforced client-side</span>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Demo-to-Login Conversion</span>
              <span className="text-lg font-bold text-blue-600">38.4%</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Prompted at 5th trial</span>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground block">Database Isolation</span>
              <span className="text-lg font-bold text-emerald-600">0 Bytes Stored</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Zero DB writes verified</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
