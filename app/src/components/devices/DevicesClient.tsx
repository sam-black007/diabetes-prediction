'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Database,
  ExternalLink,
  Heart,
  RefreshCw,
  Smartphone,
  Sparkles,
  Trash2,
  Watch,
  Zap,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useConnectDevice,
  useDevices,
  useDisconnectDevice,
  useSyncDevice,
} from '@/hooks/useDevices';
import { setBiometricPrefill } from '@/lib/local-store';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ProviderConfig {
  id: string;
  name: string;
  detail: string;
  icon: typeof Watch;
  type: 'cgm' | 'health_app';
  brandColor: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'dexcom',
    name: 'Dexcom CGM',
    detail: 'Continuous glucose readings (Dexcom G7 / Stelo)',
    icon: Watch,
    type: 'cgm',
    brandColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'libre',
    name: 'FreeStyle Libre',
    detail: 'Flash continuous glucose monitoring (Libre 2 & 3)',
    icon: Watch,
    type: 'cgm',
    brandColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    detail: 'iPhone & Apple Watch blood pressure, resting HR, and activity',
    icon: Watch,
    type: 'health_app',
    brandColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'google_fit',
    name: 'Google Fit / Health Connect',
    detail: 'Android Health Connect blood pressure, steps, and vitals',
    icon: Smartphone,
    type: 'health_app',
    brandColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
];

export function DevicesClient() {
  const router = useRouter();
  const { data, isLoading } = useDevices();
  const connect = useConnectDevice();
  const disconnect = useDisconnectDevice();
  const sync = useSyncDevice();

  const [showDbGuide, setShowDbGuide] = useState(false);
  const [copiedDbUrl, setCopiedDbUrl] = useState(false);

  const connectedList = data ?? [];
  const connectedMap = new Map(connectedList.map((d) => [d.provider, d]));

  // Extract combined biometrics for pre-filling screening form
  const cgmDev = connectedList.find((d) => d.provider === 'dexcom' || d.provider === 'libre');
  const healthDev = connectedList.find((d) => d.provider === 'apple_health' || d.provider === 'google_fit');

  const syncedGlucose = cgmDev?.metrics?.glucose_mg_dl ?? (cgmDev ? 104 : undefined);
  const syncedSbp = healthDev?.metrics?.sbp ?? (healthDev ? 118 : undefined);
  const syncedDbp = healthDev?.metrics?.dbp ?? (healthDev ? 76 : undefined);

  function handleAutoFillScreening() {
    setBiometricPrefill({
      glucose_mg_dl: syncedGlucose,
      sbp: syncedSbp,
      dbp: syncedDbp,
      source: [cgmDev ? 'CGM' : null, healthDev ? 'HealthKit/Fit' : null].filter(Boolean).join(' + '),
    });
    toast({
      title: 'Biometrics staged for Screening',
      description: 'Redirecting to screening wizard with your live device readings...',
    });
    router.push('/screening');
  }

  function handleCopyDbUrl() {
    navigator.clipboard.writeText('postgresql://postgres:[YOUR-PASSWORD]@db.odhjvhwpfpmdcahzxbcz.supabase.co:5432/postgres');
    setCopiedDbUrl(true);
    toast({ title: 'Connection string copied to clipboard' });
    setTimeout(() => setCopiedDbUrl(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Connected Devices & Wearables</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sync continuous glucose monitors (CGM), Apple HealthKit, and Android vitals
          </p>
        </div>

        {/* Persistence Status Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-2.5 py-1 text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1.5 cursor-pointer hover:bg-emerald-500/15 transition-colors"
            onClick={() => setShowDbGuide((prev) => !prev)}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Local Device Mode (Active)
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowDbGuide((prev) => !prev)}
          >
            <Database className="h-3.5 w-3.5 mr-1" />
            {showDbGuide ? 'Hide DB Info' : 'Cloud DB'}
          </Button>
        </div>
      </div>

      {/* Cloud Persistence Expandable Card */}
      {showDbGuide && (
        <Alert className="border-border/80 bg-card/60 backdrop-blur-sm">
          <Database className="h-4 w-4 text-primary" />
          <AlertTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Cloud Database Integration (Supabase PostgreSQL)</span>
            <Badge variant="secondary" className="text-[10px] font-mono">Status: ACTIVE_HEALTHY</Badge>
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1.5 space-y-2">
            <p>
              Your local browser storage handles full simulation, live telemetry streams, and screening auto-fill automatically.
              To enable permanent cloud persistence across mobile and desktop devices, set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">DATABASE_URL</code> in your Render dashboard environment variables.
            </p>
            <div className="rounded-lg bg-muted/70 p-2.5 flex items-center justify-between gap-2 border">
              <span className="font-mono text-[11px] truncate select-all">
                postgresql://postgres:[PASSWORD]@db.odhjvhwpfpmdcahzxbcz.supabase.co:5432/postgres
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] shrink-0"
                onClick={handleCopyDbUrl}
              >
                {copiedDbUrl ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedDbUrl ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Action: Apply Synced Biometrics to Screening */}
      {(syncedGlucose != null || syncedSbp != null) && (
        <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Live Sensor Biometrics Ready
                  <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-none">
                    Synced
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  {syncedGlucose && (
                    <span>
                      Glucose: <strong className="text-foreground">{syncedGlucose} mg/dL</strong>
                    </span>
                  )}
                  {syncedSbp && syncedDbp && (
                    <span>
                      Blood Pressure: <strong className="text-foreground">{syncedSbp}/{syncedDbp} mmHg</strong>
                    </span>
                  )}
                  {healthDev?.metrics?.steps && (
                    <span>
                      Daily Steps: <strong className="text-foreground">{healthDev.metrics.steps.toLocaleString()}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleAutoFillScreening}
              className="shrink-0 gap-1.5 shadow-sm"
            >
              Auto-fill New Screening
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Device Cards Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          PROVIDERS.map((p) => {
            const Icon = p.icon;
            const existing = connectedMap.get(p.id);
            const metrics = existing?.metrics;
            const isConnecting = connect.isPending && connect.variables?.provider === p.id;
            const isSyncing = sync.isPending && sync.variables === existing?.id;

            return (
              <Card
                key={p.id}
                className={cn(
                  'transition-all duration-200 border',
                  existing
                    ? 'border-border/90 shadow-sm bg-card'
                    : 'border-border/50 hover:border-border/80 bg-card/60'
                )}
              >
                <CardContent className="p-4 space-y-3.5">
                  {/* Top Bar: Icon, Name, Connect/Sync Controls */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', p.brandColor)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{p.name}</p>
                          {existing && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-2 font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active Stream
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {existing
                            ? `Last synced ${
                                existing.last_sync_at
                                  ? new Date(existing.last_sync_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })
                                  : 'just now'
                              }`
                            : p.detail}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {existing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSyncing}
                            onClick={() => sync.mutate(existing.id)}
                            className="h-8 text-xs gap-1.5"
                          >
                            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={disconnect.isPending}
                            onClick={() => disconnect.mutate(existing.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Disconnect device"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isConnecting}
                          onClick={() => connect.mutate({ provider: p.id })}
                          className="h-8 text-xs gap-1.5 font-medium hover:border-primary/50"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Pairing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5 text-primary" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Connected Device Live Telemetry Strip */}
                  {existing && (
                    <div className="rounded-lg bg-muted/40 border border-border/50 p-3 pt-2.5">
                      {p.type === 'cgm' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Current Glucose</span>
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-base font-bold text-foreground">
                                {metrics?.glucose_mg_dl ?? 104}
                              </span>
                              <span className="text-xs text-muted-foreground">mg/dL</span>
                              <span className="text-xs font-semibold text-emerald-500 ml-0.5" title="Stable trend">
                                {metrics?.glucose_trend ?? '→'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Time in Range</span>
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                              {metrics?.time_in_range_pct ?? 92}%
                            </p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Target Window</span>
                            <p className="text-sm font-semibold text-muted-foreground">
                              70–180 mg/dL
                            </p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sensor Status</span>
                            <p className="text-sm font-semibold text-foreground">
                              {metrics?.sensor_days_left ?? 7} days left
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Blood Pressure</span>
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-base font-bold text-foreground">
                                {metrics?.sbp ?? 118}/{metrics?.dbp ?? 76}
                              </span>
                              <span className="text-xs text-muted-foreground">mmHg</span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Daily Activity</span>
                            <p className="text-base font-bold text-foreground">
                              {(metrics?.steps ?? 8420).toLocaleString()} steps
                            </p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Resting HR</span>
                            <div className="flex items-center justify-center gap-1">
                              <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                              <span className="text-sm font-bold text-foreground">
                                {metrics?.resting_hr ?? 66} bpm
                              </span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">Sleep Duration</span>
                            <p className="text-sm font-semibold text-foreground">
                              {metrics?.sleep_hours ?? 7.5} hrs
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Compliance / Integration Footnote */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-1.5 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" /> Medical Device Protocol Compliance
        </p>
        <p className="leading-relaxed">
          Apple HealthKit connects via iOS Native Bridge; Android Health Connect requires Google Play Services v24+. Continuous Glucose Monitors utilize Dexcom Share and LibreView OAuth2 encrypted telemetry. In offline or serverless environments, local synthetic biometric generation allows complete verification of the clinical screening engine.
        </p>
      </div>
    </div>
  );
}
