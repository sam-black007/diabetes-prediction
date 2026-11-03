import { Suspense } from 'react';
import { ScreeningWizard } from '@/components/screening/ScreeningWizard';

export const metadata = {
  title: 'New screening · Diabetes Risk Intelligence',
};

export default function ScreeningPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading screening wizard...</div>}>
      <ScreeningWizard />
    </Suspense>
  );
}
