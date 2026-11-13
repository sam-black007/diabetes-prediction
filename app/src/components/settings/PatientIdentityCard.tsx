'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/use-toast';
import { User, Copy, Check } from 'lucide-react';
import { getMyPatientId } from '@/lib/patient-id';

export function PatientIdentityCard() {
  const [copied, setCopied] = useState(false);
  const [patientId, setPatientId] = useState('DRI-PT-80562');

  useEffect(() => {
    setPatientId(getMyPatientId());
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(patientId);
    setCopied(true);
    toast({
      title: 'Patient ID Copied',
      description: `${patientId} copied. Share this code with your doctor to enable remote monitoring.`,
    });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-bold">Clinical Patient ID</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-none">
            Shareable
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Give this medical ID to your treating doctor so they can monitor your screenings in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Your Unique Patient ID</span>
            <p className="font-mono text-lg font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
              {patientId}
            </p>
          </div>
          <Button size="sm" onClick={handleCopy} className="h-9 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy ID for Doctor'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
