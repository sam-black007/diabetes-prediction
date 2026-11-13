'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/use-toast';
import {
  User,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  getCurrentRole,
  setCurrentRole,
  verifyAdminPassword,
  getDoctorProfile,
  saveDoctorProfile,
  type UserRole,
} from '@/lib/role-store';

export function RoleLoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [adminPassword, setAdminPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpec, setDoctorSpec] = useState('');
  const [doctorHospital, setDoctorHospital] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getCurrentRole();
      setSelectedRole(current);
      const doc = getDoctorProfile();
      setDoctorName(doc.name);
      setDoctorSpec(doc.specialization);
      setDoctorHospital(doc.hospital);
      setAdminPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleConfirm() {
    if (selectedRole === 'admin') {
      if (!verifyAdminPassword(adminPassword)) {
        toast({
          variant: 'destructive',
          title: 'Admin Access Denied',
          description: 'Incorrect password. Default credentials: admin@dri2026',
        });
        return;
      }
      setCurrentRole('admin');
      toast({ title: 'Welcome Admin', description: 'Admin Command Center unlocked.' });
      onClose();
      window.location.href = '/admin';
      return;
    }

    if (selectedRole === 'doctor') {
      saveDoctorProfile({
        id: 'DR-' + Math.floor(10000 + Math.random() * 90000),
        name: doctorName || 'Dr. Medical Officer, MD',
        specialization: doctorSpec || 'Clinical Diabetology & RSSDI Fellow',
        hospital: doctorHospital || 'Metabolic Care Center',
      });
      setCurrentRole('doctor');
      toast({ title: 'Doctor Portal Active', description: 'Monitoring patient panel.' });
      onClose();
      window.location.href = '/doctor';
      return;
    }

    if (selectedRole === 'demo') {
      setCurrentRole('demo');
      toast({
        title: '🧪 Free Demo Mode Active',
        description: 'Testing freely in sandbox. Test entries will NOT be saved to the database.',
      });
      onClose();
      window.location.href = '/screening';
      return;
    }

    // Patient
    setCurrentRole('patient');
    toast({ title: 'Patient Mode Active', description: 'Personal health intake and monitoring.' });
    onClose();
    window.location.href = '/screening';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        <CardHeader className="relative pb-3">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="text-xl font-bold">Select Portal & Role</CardTitle>
          <CardDescription className="text-xs">
            Choose your access role to customize available features and security tiers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Role Selection Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedRole('patient')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'patient'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-foreground">Patient / User</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Personal screening & graph</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('doctor')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'doctor'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-foreground">Doctor Portal</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Monitor patients by ID</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'admin'
                  ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-foreground">Admin Console</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Password required</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('demo')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedRole === 'demo'
                  ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-foreground">Free Demo</span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Zero data stored</span>
            </button>
          </div>

          {/* Conditional Detail Forms */}
          {selectedRole === 'admin' && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 p-3 space-y-2">
              <label className="text-xs font-bold flex items-center gap-1 text-purple-700 dark:text-purple-300">
                <Lock className="h-3.5 w-3.5" /> Enter Admin Password
              </label>
              <Input
                type="password"
                placeholder="Enter admin password (e.g. admin@dri2026)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-white dark:bg-slate-900 text-xs h-9"
              />
              <span className="text-[10px] text-muted-foreground block">
                Default password: <code className="text-purple-600 dark:text-purple-400 font-mono font-semibold">admin@dri2026</code>
              </span>
            </div>
          )}

          {selectedRole === 'doctor' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Doctor Clinical Profile
              </span>
              <div className="space-y-1.5">
                <Input
                  placeholder="Doctor Name (e.g. Dr. Priya Nair, MD)"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Specialization (e.g. RSSDI Fellow, Diabetology)"
                  value={doctorSpec}
                  onChange={(e) => setDoctorSpec(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Hospital / Clinic (e.g. Apollo Clinical Institute)"
                  value={doctorHospital}
                  onChange={(e) => setDoctorHospital(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
              </div>
            </div>
          )}

          {selectedRole === 'demo' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" /> Sandbox Testing Mode
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                You can try the model freely with 1-click clinical presets. Your testing entries will <strong>NOT</strong> be recorded in the Supabase or EHR database.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              Continue to Portal <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
