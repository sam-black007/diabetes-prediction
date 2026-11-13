const fs = require('fs');
const path = require('path');

const wizardPath = path.join('app', 'src', 'components', 'screening', 'ScreeningWizard.tsx');
let code = fs.readFileSync(wizardPath, 'utf8');

const target = `<Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 self-start sm:self-auto"
              onClick={() => setShowLabModal(true)}
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> Paste / Import Lab Report
            </Button>`;

const replacement = `<div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs gap-1.5 border-dashed", showDemoPresets ? "border-amber-500 text-amber-600 bg-amber-500/10 dark:text-amber-400" : "text-muted-foreground")}
                onClick={() => setShowDemoPresets((v) => !v)}
              >
                <FlaskConical className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {showDemoPresets ? 'Hide Demo Presets' : 'Demo Simulation Mode'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => setShowLabModal(true)}
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste / Import Lab Report
              </Button>
            </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(wizardPath, code, 'utf8');
  console.log('✓ Added Demo Mode toggle button to Screening header');
}
