'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ClipboardPaste,
  FileJson,
  FileText,
  HeartPulse,
  History,
  Plus,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function ClinicalHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Hospital Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-xs">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white block">
                Diabetes<span className="text-blue-600">Risk</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Clinical Diabetology Portal
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/screening" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Patient Screening
            </Link>
            <Link href="/screening?mode=demo" className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
              <FlaskConical className="h-3.5 w-3.5" /> Free Demo (5 Trials)
            </Link>
            <Link href="/history" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Patient History & Trends
            </Link>
            <Link href="/devices" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Biometric Devices
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> ICMR / RSSDI Protocol
            </span>
            <ThemeToggle />
            <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
              <Link href="/screening">
                <Plus className="h-3.5 w-3.5" /> Start Screening
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Clinical Portal Workspace */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-6xl">
        {/* Clinical Header Banner */}
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold">
                ICMR-INDIAB & RSSDI Clinical Guidelines
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Metabolic Health & Diabetes Risk Evaluation System
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                Standardized diagnostic screening calibrated to the South Asian metabolic phenotype. Evaluates fasting/postprandial glucose, MDRF Indian Diabetes Risk Score (IDRS), atherogenic dyslipidemia index (TG/HDL), and Asian-Indian BMI thresholds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 shrink-0">
              <Button asChild size="lg" className="h-10 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                <Link href="/screening">
                  <Stethoscope className="h-4 w-4" /> Start Clinical Screening <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-10 text-xs font-bold gap-2 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs">
                <Link href="/screening?mode=demo">
                  <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Try Free Demo (5 Free Trials)
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-10 text-xs font-semibold gap-2">
                <Link href="/history">
                  <History className="h-4 w-4" /> Patient Records
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* 3 Direct Clinical Workflows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Rapid Biomarker Triage
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter fasting plasma glucose, venous HbA1c, hemodynamics (BP), and demographic parameters for instantaneous risk stratification.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
              <Link href="/screening">Launch Screening</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ClipboardPaste className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Pathology Lab Extraction
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Paste raw clinical biochemistry notes from Dr. Lal PathLabs, Quest, or Apollo to auto-populate the diagnostic evaluation matrix.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
              <Link href="/screening">Extract Lab Values</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileJson className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                EHR Standards & PDF Export
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate official ICMR-branded diagnostic PDF summary reports, HL7 FHIR R4 JSON payloads, and CDA XML interoperability files.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
              <Link href="/history">View Patient Registry</Link>
            </Button>
          </div>
        </div>

        {/* Diagnostic Reference Standards Matrix */}
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ICMR-INDIAB & WHO Clinical Reference Standards
              </h2>
              <p className="text-xs text-slate-500">Established diagnostic thresholds for South Asian adults</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded">
              Evidence-Based Cutoffs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Diagnostic Biomarker</th>
                  <th className="py-2.5 px-3">Optimal / Normal</th>
                  <th className="py-2.5 px-3">Impaired / Borderline</th>
                  <th className="py-2.5 px-3">High Risk / Diagnostic Cutoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Fasting Plasma Glucose (FPG)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">&lt; 100 mg/dL</td>
                  <td className="py-3 px-3 text-amber-600 font-bold">100 - 125 mg/dL (IFG)</td>
                  <td className="py-3 px-3 text-red-600 font-bold">&ge; 126 mg/dL (Diabetic)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">MDRF Indian Diabetes Risk Score (IDRS)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">&lt; 30 (Low Risk)</td>
                  <td className="py-3 px-3 text-amber-600 font-bold">30 - 50 (Moderate Risk)</td>
                  <td className="py-3 px-3 text-red-600 font-bold">&ge; 60 (High Risk, 95% Sensitivity)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">TG / HDL Atherogenic Dyslipidemia Index</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">&lt; 2.0 (Favorable)</td>
                  <td className="py-3 px-3 text-amber-600 font-bold">2.0 - 2.9 (Mild Risk)</td>
                  <td className="py-3 px-3 text-red-600 font-bold">&ge; 3.0 (Severe sdLDL / Insulin Resistance)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Asian-Indian Specific BMI</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">18.0 - 22.9 kg/m2</td>
                  <td className="py-3 px-3 text-amber-600 font-bold">23.0 - 24.9 kg/m2 (Overweight)</td>
                  <td className="py-3 px-3 text-red-600 font-bold">&ge; 25.0 kg/m2 (Obese per ICMR)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Hemodynamics (Blood Pressure)</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">&lt; 120/80 mmHg</td>
                  <td className="py-3 px-3 text-amber-600 font-bold">120-129 / &lt;80 mmHg</td>
                  <td className="py-3 px-3 text-red-600 font-bold">&ge; 130/80 mmHg (Stage 1 HTN)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Hospital Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
            <HeartPulse className="h-4 w-4 text-blue-600" />
            Diabetes Risk Intelligence System - ICMR-INDIAB & RSSDI Framework
          </div>
          <div className="text-[11px] text-slate-400">
            Diagnostic Clinical Decision Support System. Validated for South Asian adult populations.
          </div>
        </div>
      </footer>
    </div>
  );
}
