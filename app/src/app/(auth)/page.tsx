'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  ClipboardPaste,
  Cpu,
  Download,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  Scale,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  TrendingDown,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

const API_DOCS = `${process.env.NEXT_PUBLIC_API_URL ?? 'https://diabetes-prediction-api-9hx8.onrender.com'}/docs`;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-base sm:text-lg tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span>
              Diabetes<span className="text-primary font-semibold">Risk</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/screening" className="transition-colors hover:text-foreground">
              Screening
            </Link>
            <Link href="/history" className="transition-colors hover:text-foreground">
              History
            </Link>
            <Link href="/devices" className="transition-colors hover:text-foreground">
              Devices
            </Link>
            <a href={API_DOCS} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              API Docs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ML Engine Live
            </div>
            <Link href="/screening">
              <Button size="sm" className="gap-1.5 font-medium shadow-sm">
                Start Screening <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[360px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>ADA 2026 Guidelines + Calibrated ML Ensemble</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Clinical-Grade{' '}
                <span className="bg-gradient-to-r from-primary via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Diabetes Risk
                </span>{' '}
                Intelligence
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Evidence-based diabetes risk stratification combining official American Diabetes Association (ADA) criteria with gradient-boosted machine learning, SHAP explainability, and interactive lifestyle simulators.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link href="/screening" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 px-7 text-base font-semibold shadow-md">
                    Start Free Screening <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/screening" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-base">
                    <ClipboardPaste className="h-4 w-4 text-primary" /> Paste Lab Report
                  </Button>
                </Link>
                <a href={API_DOCS} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="w-full sm:w-auto gap-2 text-base text-muted-foreground hover:text-foreground">
                    <Cpu className="h-4 w-4" /> API Docs
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100% Free & No Sign-In Required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Fasting & HbA1c Supported
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> FHIR & CDA Export Ready
                </span>
              </div>
            </div>

            {/* Right Column: Live Interactive Card Preview */}
            <div className="lg:col-span-5">
              <Card className="relative overflow-hidden border-primary/20 shadow-xl bg-card/80 backdrop-blur-sm">
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-teal-500" />

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Activity className="h-4 w-4 text-primary" /> Live Sample Result
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Low Risk
                    </span>
                  </div>
                  <CardTitle className="text-xl">Composite Health Score</CardTitle>
                  <CardDescription>Multi-biomarker weighted clinical index</CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Score Visualization */}
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 p-4 border border-border/50">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground">88</span>
                        <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Optimal metabolic range</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-muted-foreground">ML Probability</div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        12.4% (Calibrated)
                      </div>
                    </div>
                  </div>

                  {/* Biomarkers Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border p-2.5 bg-background/50">
                      <div className="text-muted-foreground">Fasting Glucose</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">88 mg/dL</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Optimal (&lt; 100)</div>
                    </div>
                    <div className="rounded-lg border p-2.5 bg-background/50">
                      <div className="text-muted-foreground">Blood Pressure</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">118 / 74 mmHg</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Normal range</div>
                    </div>
                    <div className="rounded-lg border p-2.5 bg-background/50">
                      <div className="text-muted-foreground">Body Mass Index</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">22.4 kg/m²</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Healthy weight</div>
                    </div>
                    <div className="rounded-lg border p-2.5 bg-background/50">
                      <div className="text-muted-foreground">SHAP Attribution</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">-0.42 Glucose</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Protective factor</div>
                    </div>
                  </div>

                  {/* Quick-Launch Presets */}
                  <div className="pt-2 border-t space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Try instant screening profiles:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <Link href="/screening" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          🟢 Optimal
                        </Button>
                      </Link>
                      <Link href="/screening" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          🟡 Prediabetes
                        </Button>
                      </Link>
                      <Link href="/screening" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          🔴 Elevated
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="border-y bg-muted/20 py-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-foreground">ADA 2026</div>
              <div className="text-xs text-muted-foreground">Latest Clinical Guidelines</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-foreground">&lt; 400 ms</div>
              <div className="text-xs text-muted-foreground">FastAPI + ML Latency</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-foreground">10+ Biomarkers</div>
              <div className="text-xs text-muted-foreground">Full Metabolic Analysis</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">100% Free</div>
              <div className="text-xs text-muted-foreground">Open Source & Private</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Full Suite Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for Patients, Clinicians, & Health Tech
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              A comprehensive screening system engineered for clinical accuracy, transparent explanations, and zero-barrier access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Sliders className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Interactive What-If Simulator</CardTitle>
                <CardDescription>
                  Real-time recalculation sliders for weight loss, glucose control, and blood pressure with 1-click 7% ADA weight target projections.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <ClipboardPaste className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Lab Report & EHR Text Extractor</CardTitle>
                <CardDescription>
                  Instant regex parsing that extracts glucose, HbA1c, lipids, BP, and vitals directly from messy hospital notes or Quest/LabCorp portals.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Physician Discussion Guide</CardTitle>
                <CardDescription>
                  Personalized questions generated from your specific biomarkers and a 1-click &ldquo;Copy Clinical Summary&rdquo; note ready for your doctor appointment.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <Brain className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Gradient Boosting & SHAP Explainability</CardTitle>
                <CardDescription>
                  Ensemble ML calibrated with isotonic regression and individual SHAP value explanations for every metabolic risk driver.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                  <FileText className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Interoperable FHIR & CDA Export</CardTitle>
                <CardDescription>
                  Standards-compliant FHIR R4 JSON and CDA XML export protocols for seamless integration into modern hospital and EHR systems.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">PWA Offline Evaluation</CardTitle>
                <CardDescription>
                  Progressive Web App support enabling client-side evaluation and offline queuing when an internet connection is unavailable.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to evaluate your metabolic health?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Takes under 2 minutes. Free, anonymous, and no account or credit card required.
          </p>
          <div className="pt-2">
            <Link href="/screening">
              <Button size="lg" variant="secondary" className="gap-2 px-8 py-3 text-base font-semibold shadow-lg">
                Start Screening Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <HeartPulse className="h-5 w-5 text-primary" />
              Diabetes Risk Intelligence v2.0
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/screening" className="hover:text-foreground transition-colors">
                Screening
              </Link>
              <Link href="/history" className="hover:text-foreground transition-colors">
                History
              </Link>
              <a href={API_DOCS} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
                API Docs
              </a>
              <a
                href="https://github.com/sam-black007/diabetes-prediction"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub Repository
              </a>
            </div>

            <div className="text-xs text-muted-foreground text-center md:text-right">
              Medical Disclaimer: For informational & screening purposes only. Always consult a licensed physician.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
