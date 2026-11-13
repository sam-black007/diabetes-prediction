'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, ShieldCheck } from 'lucide-react';
import { getCurrentRole, setCurrentRole, verifyAdminPassword } from '@/lib/role-store';
import { AdminModernDashboard } from '@/components/admin/AdminModernDashboard';

export default function AdminPage() {
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | 'demo'>('patient');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRole(getCurrentRole());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setCurrentRole('admin');
      setRole('admin');
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect administrator password.');
    }
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center p-6 space-y-4 bg-slate-900 border-slate-800 text-white shadow-2xl rounded-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Admin Command Console</CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Enter the administrator password to unlock telemetry and diagnostic testing.
            </CardDescription>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 pt-2 text-left">
            <div>
              <Input
                type="password"
                placeholder="Enter administrator password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs text-white h-10"
                autoFocus
              />
              {errorMsg && <p className="text-rose-400 text-[11px] mt-1 font-semibold">{errorMsg}</p>}
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-10 gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Unlock Admin Command Center
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return <AdminModernDashboard />;
}
