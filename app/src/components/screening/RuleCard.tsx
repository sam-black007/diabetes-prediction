import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { severityBadgeClass } from '@/lib/risk';
import type { ClinicalRule } from '@/lib/types';
import { cn } from '@/utils/utils';

export function RuleCard({ rule }: { rule: ClinicalRule }) {
  const severityClass = severityBadgeClass(rule.severity);

  return (
    <Card className="relative overflow-hidden group">
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{rule.metric}</p>
              <p className="text-[10px] text-muted-foreground">{rule.measurement_type}</p>
            </div>
            <Badge className={cn('border px-2 py-1 text-[10px]', severityClass)}>
              {rule.category}
            </Badge>
          </div>

          {rule.value != null && (
            <p className="text-xl font-mono font-bold text-muted-foreground leading-none">
              {String(rule.value)}
            </p>
          )}

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {rule.interpretation && <span>{rule.interpretation}</span>}
            {rule.red_flag && (
              <span className="text-[destructive]">⚠ Red flag</span>
            )}
            {rule.is_diagnostic && (
              <Badge variant="outline" className="text-[10px]">
                Diagnostic
              </Badge>
            )}
            {rule.source && (
              <span className="ml-auto opacity-50">{rule.source}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
