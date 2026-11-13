'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  AlertTriangle,
  Award,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Calendar,
  HeartPulse,
  Droplets,
  Activity,
  Stethoscope,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/use-toast';
import { getDoctorProfile } from '@/lib/role-store';
import {
  listMonitoredPatients,
  addMonitoredPatient,
  removeMonitoredPatient,
  type MonitoredPatient,
} from '@/lib/doctor-store';

export function DoctorModernDashboard() {
  const [patients, setPatients] = useState<MonitoredPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<MonitoredPatient | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'improving'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vitalsRange, setVitalsRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [doctorInfo, setDoctorInfo] = useState({ name: 'Dr. Rivera', specialization: 'Diabetology & Cardiology' });

  // Add patient form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    setPatients(listMonitoredPatients());
    const doc = getDoctorProfile();
    if (doc.name) {
      setDoctorInfo({ name: doc.name, specialization: doc.specialization || 'Clinical Diabetology' });
    }
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterTab === 'critical') return p.status === 'critical';
      if (filterTab === 'improving') return p.status === 'improving';
      return true;
    });
  }, [patients, searchQuery, filterTab]);

  // Weekly Admissions/Screenings data (Emergency vs Scheduled)
  const weeklyData = [
    { day: 'Mon', emergency: 42, scheduled: 30 },
    { day: 'Tue', emergency: 48, scheduled: 38 },
    { day: 'Wed', emergency: 35, scheduled: 28 },
    { day: 'Thu', emergency: 55, scheduled: 40 },
    { day: 'Fri', emergency: 45, scheduled: 35 },
  ];

  // Diagnosis Mix donut data
  const diagnosisMixData = [
    { name: 'Type 2 Diabetes', value: 480, color: '#f97316' },
    { name: 'Hypertension', value: 340, color: '#10b981' },
    { name: 'Impaired Fasting', value: 240, color: '#eab308' },
    { name: 'Atherogenic Dyslipidemia', value: 140, color: '#a855f7' },
    { name: 'Normative / Healthy', value: 84, color: '#3b82f6' },
  ];

  // 30-Day Vitals Trend data
  const trendData = [
    { date: 'Feb 16', glucose: 132, sbp: 138, heartRate: 78 },
    { date: 'Feb 22', glucose: 124, sbp: 132, heartRate: 75 },
    { date: 'Mar 1', glucose: 118, sbp: 128, heartRate: 74 },
    { date: 'Mar 7', glucose: 122, sbp: 130, heartRate: 76 },
    { date: 'Mar 13', glucose: 114, sbp: 124, heartRate: 72 },
    { date: 'Mar 17', glucose: 108, sbp: 120, heartRate: 70 },
  ];

  function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;
    const added = addMonitoredPatient(newId, newName, newNotes);
    setPatients(listMonitoredPatients());
    setNewId('');
    setNewName('');
    setNewNotes('');
    setShowAddModal(false);
    toast({ title: 'Patient Linked', description: `Added ${added.name} (${added.id}) to clinical roster.` });
  }

  function handleRemove(id: string, name: string) {
    removeMonitoredPatient(id);
    setPatients(listMonitoredPatients());
    if (selectedPatient?.id === id) setSelectedPatient(null);
    toast({ title: 'Patient Removed', description: `${name} removed from active roster.` });
  }

  // IF PATIENT IS SELECTED: RENDER INDIVIDUAL PATIENT CLINICAL PORTFOLIO
  if (selectedPatient) {
    const p = selectedPatient;
    const mapBP = Math.round(p.dbp + (p.sbp - p.dbp) / 3);
    const isCritical = p.status === 'critical';

    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setSelectedPatient(null)}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Diagnostic Queue
            </Button>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs font-semibold text-slate-400">Individual Patient Portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-xs px-2.5 py-0.5 border-none font-bold ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-400'
                  : p.status === 'monitoring'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              ● {p.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Patient Hero Dossier */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-black text-sm">
                {p.sex === 'M' ? '♂' : '♀'} {p.age}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-white">{p.name}</h2>
                  <Badge variant="outline" className="font-mono text-xs border-slate-700 text-slate-300">{p.id}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  <strong>Clinical Diagnosis:</strong> {p.diagnosis}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Last Screened: {p.updated_at} • Monitored since {new Date(p.added_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => window.location.href = '/history'}
                size="sm"
                className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                <FileText className="h-3.5 w-3.5" /> Export ICMR Lab PDF
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Core Clinical Biomarker Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Blood Glucose */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Blood Glucose Profile</span>
              <Droplets className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{p.glucose_mg_dl} <span className="text-xs font-normal text-slate-400">mg/dL</span></div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Fasting Plasma Glucose (FPG)</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Postprandial:</span>
                <span className="font-bold text-slate-200">{p.glucose_pp_mg_dl} mg/dL</span>
              </div>
              <div>
                <span className="text-slate-500 block">Est. HbA1c:</span>
                <span className="font-bold text-amber-400">{p.hba1c}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Hemodynamics / Blood Pressure */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Hemodynamics & BP</span>
              <HeartPulse className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{p.sbp} / {p.dbp} <span className="text-xs font-normal text-slate-400">mmHg</span></div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {p.sbp >= 140 ? 'Stage 2 Hypertension' : p.sbp >= 130 ? 'Stage 1 Hypertension' : 'Normative BP'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Heart Rate:</span>
                <span className="font-bold text-slate-200">{p.heart_rate_bpm} bpm</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mean Arterial (MAP):</span>
                <span className="font-bold text-slate-200">{mapBP} mmHg</span>
              </div>
            </div>
          </div>

          {/* Card 3: South Asian Indices */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">South Asian Phenotype</span>
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{p.bmi} <span className="text-xs font-normal text-slate-400">kg/m²</span></div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Asian-Indian BMI ({p.bmi >= 23 ? 'Overweight cutoff exceeded' : 'Optimal range'})
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">IDRS Risk:</span>
                <span className="font-bold text-slate-200">{p.idrs_score}/100</span>
              </div>
              <div>
                <span className="text-slate-500 block">TG/HDL Ratio:</span>
                <span className="font-bold text-amber-400">{p.tg_hdl_ratio}</span>
              </div>
            </div>
          </div>

          {/* Card 4: AI Health Score & Trajectory */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">AI Clinical Score</span>
              <Award className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">{p.health_score} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                AI Risk Score: {p.ai_risk_score} (Concordance: 99.2%)
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Trajectory:</span>
              <span className="font-bold text-emerald-400">
                {p.health_score >= 80 ? '↑ Optimal Control' : p.health_score >= 60 ? '↔ Stabilizing' : '↓ Escalation Required'}
              </span>
            </div>
          </div>
        </div>

        {/* Individual Patient 30-Day Vitals Trend */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Longitudinal Trajectory & Glycemic Excursion</h4>
              <p className="text-xs text-slate-400">Correlated fasting glucose, systolic blood pressure, and resting heart rate.</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">Last 30 Days</Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="glucose" name="Fasting Glucose (mg/dL)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="sbp" name="Systolic BP (mmHg)" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dr. Charak AI Guidance & Clinical Prescriptions */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
            <Sparkles className="h-4 w-4" /> Dr. Charak AI Clinical Recommendation (ICMR-INDIAB & RSSDI 2024 Protocol)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {p.clinical_notes}
          </p>
          <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Dietary Action</span>
              <span className="font-bold text-slate-200 mt-1 block">Shatapadi Walking</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">100 steps after dinner; replace white rice with foxtail millet.</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Biometric Follow-up</span>
              <span className="font-bold text-slate-200 mt-1 block">Continuous CGM Telemetry</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Monitor post-meal peak; target &lt;140 mg/dL within 2 hours.</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Cardiovascular Care</span>
              <span className="font-bold text-slate-200 mt-1 block">Sodium &lt;2,000 mg/day</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Re-check resting blood pressure in 14 days.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: DOCTOR COMMAND DASHBOARD
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 sm:p-6 space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Good morning, {doctorInfo.name} ☀️
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monday, 17 March 2026 • Ward 4B — {doctorInfo.specialization} & Metabolic OPD
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search patients, reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-60 sm:w-72 bg-[#0f172a]/80 border-slate-800 pl-9 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-600 rounded-xl"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" /> Link Patient
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Patients */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Patients</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-white">1,284</span>
            <span className="text-[11px] font-bold text-emerald-400">▲ 3.2% vs last week</span>
          </div>
        </div>

        {/* Card 2: Critical Alerts */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critical Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-rose-400">7</span>
            <span className="text-[11px] font-bold text-rose-400">▲ 2 new since 6am</span>
          </div>
        </div>

        {/* Card 3: Avg Recovery / Health Score */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Recovery Score</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-white">84.6</span>
            <span className="text-[11px] font-bold text-emerald-400">▲ 1.8 pts this month</span>
          </div>
        </div>

        {/* Card 4: AI Risk Flags */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Risk Flags</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-white">23</span>
            <span className="text-[11px] font-semibold text-purple-400">● 5 high-priority</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Weekly Admissions vs Diagnosis Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Weekly Admissions / Screenings */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Weekly Screenings & Admissions</h3>
              <p className="text-xs text-slate-400">Emergency Excursions vs Scheduled Follow-ups</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-500"></span> Emergency
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span> Scheduled
              </div>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="emergency" name="Emergency" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Diagnosis Mix Donut Chart */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Diagnosis Mix</h3>
              <p className="text-xs text-slate-400">Current patient cohort distribution</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">Last 30 days</Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diagnosisMixData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {diagnosisMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b0f19',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-white">1,284</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">patients</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              {diagnosisMixData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-slate-300 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[11px] text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3 text-xs text-slate-400 leading-relaxed italic">
            &ldquo;In the coming months, we anticipate a significant shift in health schedules as more people prioritize wellness. With AI-driven biomarker screening, early lifestyle interventions yield timely recovery.&rdquo;
          </div>
        </div>
      </div>

      {/* Bottom Section: 30-Day Vitals Trend vs Priority Patient Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Cardiac & Metabolic Vitals Trend */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Cardiac & Metabolic Vitals — 30 Day Trend</h3>
              <p className="text-xs text-slate-400">Averaged across monitored clinical cohort</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setVitalsRange(r)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    vitalsRange === r ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b0f19',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line type="monotone" dataKey="glucose" name="Glucose (mg/dL)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sbp" name="BP Systolic (mmHg)" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Priority Patient Queue (Diagnostic List) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Priority Patient Queue</h3>
              <p className="text-xs text-slate-400">Sorted by AI risk score • Real-time clinical status</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              {(['all', 'critical', 'improving'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition-all ${
                    filterTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="pb-2">Patient</th>
                  <th className="pb-2">Diagnosis</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Glucose/HR</th>
                  <th className="pb-2">BP</th>
                  <th className="pb-2">AI Risk</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPatients.map((p) => {
                  const isCritical = p.status === 'critical';
                  const isMonitoring = p.status === 'monitoring';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{p.id}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px] max-w-[140px] truncate">{p.diagnosis}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400'
                              : isMonitoring
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300 font-mono text-[11px]">{p.glucose_mg_dl} mg • {p.heart_rate_bpm} bpm</td>
                      <td className="py-2.5 text-slate-300 font-mono text-[11px]">{p.sbp}/{p.dbp}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              p.ai_risk_score >= 80 ? 'text-rose-400' : p.ai_risk_score >= 60 ? 'text-amber-400' : 'text-blue-400'
                            }`}
                          >
                            {p.ai_risk_score}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-blue-400 group-hover:translate-x-1 inline-block transition-transform text-xs font-semibold">
                          Portfolio →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" /> Link Patient to Clinical Roster
            </h3>
            <form onSubmit={handleAddPatient} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Patient ID (from patient settings):</label>
                <Input
                  placeholder="e.g. DRI-PT-80562 or #P-00511"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Patient Full Name:</label>
                <Input
                  placeholder="e.g. Vikram Malhotra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Clinical Notes & Diet Rx:</label>
                <Input
                  placeholder="e.g. Transitioning to barnyard millets and Shatapadi walk"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  Confirm & Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
