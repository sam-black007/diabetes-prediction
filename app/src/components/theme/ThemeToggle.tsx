'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('h-9 w-9 rounded-lg border border-border/40 bg-muted/20', className)} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={cn(
        'relative h-8 w-8 rounded-lg p-0 transition-all border-border/60 hover:bg-muted/80',
        className
      )}
    >
      <Sun
        className={cn(
          'h-4 w-4 transition-all duration-300',
          isDark ? 'scale-0 rotate-90 opacity-0 absolute' : 'scale-100 rotate-0 opacity-100 text-amber-500'
        )}
      />
      <Moon
        className={cn(
          'h-4 w-4 transition-all duration-300',
          isDark ? 'scale-100 rotate-0 opacity-100 text-sky-400' : 'scale-0 -rotate-90 opacity-0 absolute'
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-64 rounded-lg bg-muted/40 animate-pulse" />;
  }

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 text-sm">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
