import { PatientIdentityCard } from '@/components/settings/PatientIdentityCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { ApiKeysClient } from '@/components/settings/ApiKeysClient';
import { FeatureFlagsPanel } from '@/components/settings/FeatureFlagsPanel';
import { ThemeSegmentedControl } from '@/components/theme/ThemeToggle';
import { GeminiSettingsCard } from '@/components/settings/GeminiSettingsCard';

export const metadata = { title: 'Settings — Diabetes Risk Intelligence' };

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PatientIdentityCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Units</CardTitle>
          <CardDescription>Preferred display units for glucose.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="secondary" size="sm">mg/dL</Button>
          <Button variant="outline" size="sm" disabled>mmol/L (soon)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Select your preferred color theme or match your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ThemeSegmentedControl />
          <p className="text-xs text-muted-foreground">
            Choose between Light mode, Dark mode, or follow your operating system automatically.
          </p>
        </CardContent>
      </Card>

      <GeminiSettingsCard />
      <ApiKeysClient />
      <FeatureFlagsPanel />
    </div>
  );
}
