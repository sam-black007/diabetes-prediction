'use client';

import { useState, useEffect } from 'react';
import {
  Stethoscope,
  UserPlus,
  Trash2,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/use-toast';
import {
  listMonitoredPatients,
  addMonitoredPatient,
  removeMonitoredPatient,
  type MonitoredPatient,
} from '@/lib/doctor-store';

export function DoctorPatientMonitor() {
  const [patients, setPatients] = useState<MonitoredPatient[]>([]);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [clinicalNotesInput, setClinicalNotesInput] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<MonitoredPatient | null>(null);

  useEffect(() => {
    setPatients(listMonitoredPatients());
  }, []);

  function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!patientIdInput.trim()) {
      toast({ variant: 'destructive', title: 'Patient ID required', description: 'Please enter a Patient ID (e.g. DRI-PT-80562).' });
      return;
    }

    const added = addMonitoredPatient(patientIdInput, patientNameInput, clinicalNotesInput);
    setPatients(listMonitoredPatients());
    setPatientIdInput('');
    setPatientNameInput('');
    setClinicalNotesInput('');

    toast({
      title: 'Patient Connected',
      description: `Successfully added ${added.name} (${added.id}) to clinical roster.`,
    });
  }

  function handleRemove(id: string, name: string) {
    removeMonitoredPatient(id);
    setPatients(listMonitoredPatients());
    if (selectedPatient?.id === id) setSelectedPatient(null);
    toast({ title: 'Patient Removed', description: `${name} removed from your watchlist.` });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Stethoscope className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Physician & Diabetologist Command Console
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Monitor real-time metabolic trajectories, glycemic spikes, and emergency alerts for all patients under your supervision.
            </p>
          </div>
          <div className="rounded-lg border bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-center shadow-2xs">
            <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Active Roster</span>
            <span className="text-sm font-bold text-blue-600">{patients.length} Patients</span>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Add Patient to Monitor by ID
          </CardTitle>
          <CardDescription className="text-xs">
            Ask the patient for their <strong>Patient ID</strong> (from their settings) to link their diagnostic records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddPatient} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input
              placeholder="DRI-PT-80562"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              className="h-9 text-xs font-mono font-bold uppercase"
            />
            <Input
              placeholder="Patient Full Name"
              value={patientNameInput}
              onChange={(e) => setPatientNameInput(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Clinical Notes / Diet Rx"
              value={clinicalNotesInput}
              onChange={(e) => setClinicalNotesInput(e.target.value)}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm" className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-3.5 w-3.5" />
              Add to Monitor
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {patients.map((p) => {
            const isHigh = p.risk_category === 'high' || p.risk_category === 'very_high';
            const isMedium = p.risk_category === 'medium';
            const isSelected = selectedPatient?.id === p.id;

            return (
              <Card key={p.id} className="border border-border/80 hover:border-border transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                        isHigh ? 'bg-rose-100 text-rose-700' : isMedium ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.sex === 'M' ? '♂' : '♀'} {p.age}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold">{p.name}</h5>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">{p.id}</Badge>
                          <Badge className={`text-[10px] py-0 px-2 font-semibold border-none ${
                            isHigh ? 'bg-rose-500/15 text-rose-600' : isMedium ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'
                          }`}>
                            {isHigh ? 'High Risk' : isMedium ? 'Moderate' : 'Optimal'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.clinical_notes}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border text-xs shrink-0">
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase font-semibold">Score</span>
                        <span className="font-bold">{p.health_score}/100</span>
                      </div>
                      <div className="h-5 w-px bg-border" />
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase font-semibold">Glucose</span>
                        <span className="font-bold">{p.glucose_mg_dl} mg/dL</span>
                      </div>
                      <div className="h-5 w-px bg-border" />
                      <div>
                        <span className="block text-[9px] text-muted-foreground uppercase font-semibold">BP</span>
                        <span className="font-bold">{p.sbp}/{p.dbp}</span>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <Button
                          size="sm"
                          variant={isSelected ? 'default' : 'outline'}
                          className="h-7 text-[11px] px-2.5"
                          onClick={() => setSelectedPatient(isSelected ? null : p)}
                        >
                          {isSelected ? 'Hide' : 'Review Case'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => handleRemove(p.id, p.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t text-xs space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        Dr. Charak AI Guidance (ICMR-INDIAB):
                      </span>
                      <p className="text-muted-foreground">
                        {isHigh
                          ? 'Patient presents with elevated post-meal excursion. Recommend immediate 100-step Shatapadi walk after meals and elimination of liquid refined sucrose.'
                          : 'Patient maintains homeostatic metabolic score. Continue foxtail millet staple substitution.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
