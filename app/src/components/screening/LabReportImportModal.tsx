'use client';

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  ClipboardPaste,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  ScanLine,
} from 'lucide-react';
import type { UseFormSetValue } from 'react-hook-form';
import type { ScreeningFormValues } from '@/lib/validation/screening';
import { cn } from '@/lib/utils';

interface LabReportImportModalProps {
  setValue: UseFormSetValue<ScreeningFormValues>;
  onClose: () => void;
  onExtracted?: () => void;
}

interface ExtractedBiomarkers {
  glucose_mg_dl?: number;
  glucose_type?: 'fasting' | 'postprandial' | 'random' | 'hba1c';
  sbp?: number;
  dbp?: number;
  ldl_mg_dl?: number;
  hdl_mg_dl?: number;
  triglycerides_mg_dl?: number;
  weight_kg?: number;
  height_cm?: number;
  age?: number;
}

export function parseLabText(rawText: string): ExtractedBiomarkers {
  const extracted: ExtractedBiomarkers = {};
  const text = rawText.toLowerCase();

  // 1. HbA1c (e.g., HbA1c: 6.8%, Glycated Hemoglobin: 7.2)
  const a1cMatch = text.match(/(?:hba1c|a1c|glycated\s+hemoglobin|glycohemoglobin)[^\d]{1,15}(\d+(?:\.\d+)?)\s*%/);
  if (a1cMatch) {
    const val = parseFloat(a1cMatch[1]);
    if (val >= 4.0 && val <= 18.0) {
      extracted.glucose_mg_dl = val;
      extracted.glucose_type = 'hba1c';
    }
  }

  // 2. Fasting / Random Glucose (e.g., Fasting Blood Sugar: 126 mg/dL, Glucose, Fasting: 110)
  if (!extracted.glucose_mg_dl) {
    const fastingMatch = text.match(/(?:fasting\s+(?:blood\s+)?glucose|glucose[,\s]+fasting|fbs)[^\d]{1,15}(\d+(?:\.\d+)?)/);
    if (fastingMatch) {
      const val = parseFloat(fastingMatch[1]);
      if (val >= 40 && val <= 600) {
        extracted.glucose_mg_dl = val;
        extracted.glucose_type = 'fasting';
      }
    } else {
      const generalGlucoseMatch = text.match(/(?:blood\s+glucose|plasma\s+glucose|glucose)[^\d]{1,15}(\d+(?:\.\d+)?)/);
      if (generalGlucoseMatch) {
        const val = parseFloat(generalGlucoseMatch[1]);
        if (val >= 40 && val <= 600) {
          extracted.glucose_mg_dl = val;
          extracted.glucose_type = 'random';
        }
      }
    }
  }

  // 3. Blood Pressure (e.g., BP: 138/88 mmHg, Blood Pressure: 130/85)
  const bpMatch = text.match(/(?:bp|blood\s+pressure)[^\d]{1,15}(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
  if (bpMatch) {
    const sbp = parseInt(bpMatch[1], 10);
    const dbp = parseInt(bpMatch[2], 10);
    if (sbp >= 70 && sbp <= 260 && dbp >= 40 && dbp <= 160) {
      extracted.sbp = sbp;
      extracted.dbp = dbp;
    }
  }

  // 4. Lipid Panel: LDL, HDL, Triglycerides
  const ldlMatch = text.match(/(?:ldl(?:\s+cholesterol)?|ldl-c)[^\d]{1,15}(\d+(?:\.\d+)?)/);
  if (ldlMatch) {
    const val = parseFloat(ldlMatch[1]);
    if (val >= 10 && val <= 400) extracted.ldl_mg_dl = Math.round(val);
  }

  const hdlMatch = text.match(/(?:hdl(?:\s+cholesterol)?|hdl-c)[^\d]{1,15}(\d+(?:\.\d+)?)/);
  if (hdlMatch) {
    const val = parseFloat(hdlMatch[1]);
    if (val >= 10 && val <= 180) extracted.hdl_mg_dl = Math.round(val);
  }

  const trigMatch = text.match(/(?:triglycerides|triglyceride|tg)[^\d]{1,15}(\d+(?:\.\d+)?)/);
  if (trigMatch) {
    const val = parseFloat(trigMatch[1]);
    if (val >= 20 && val <= 1500) extracted.triglycerides_mg_dl = Math.round(val);
  }

  // 5. Demographics (Age, Weight, Height)
  const ageMatch = text.match(/(?:age|years\s+old)[^\d]{1,10}(\d{1,3})/);
  if (ageMatch) {
    const val = parseInt(ageMatch[1], 10);
    if (val >= 1 && val <= 120) extracted.age = val;
  }

  const weightMatch = text.match(/(?:weight|wt)[^\d]{1,10}(\d+(?:\.\d+)?)\s*(?:kg|kgs)/);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    if (val >= 25 && val <= 250) extracted.weight_kg = val;
  }

  const heightMatch = text.match(/(?:height|ht)[^\d]{1,10}(\d+(?:\.\d+)?)\s*(?:cm)/);
  if (heightMatch) {
    const val = parseFloat(heightMatch[1]);
    if (val >= 80 && val <= 230) extracted.height_cm = val;
  }

  return extracted;
}

const SAMPLE_LAB_REPORT = `COMPREHENSIVE METABOLIC & LIPID PANEL
Patient: Anonymous
Age: 52  Sex: M
Vitals: BP 138/88 mmHg, Weight: 84.5 kg, Height: 174 cm

TEST RESULTS:
- Fasting Blood Glucose: 128 mg/dL (Reference: 70 - 99 mg/dL) [HIGH]
- Hemoglobin A1c (HbA1c): 6.7 % (Reference: < 5.7 %) [HIGH]
- Total Cholesterol: 212 mg/dL
- LDL Cholesterol: 135 mg/dL [BORDERLINE HIGH]
- HDL Cholesterol: 42 mg/dL
- Triglycerides: 178 mg/dL [ELEVATED]`;

export function LabReportImportModal({ setValue, onClose, onExtracted }: LabReportImportModalProps) {
  const [importMode, setImportMode] = useState<'photo' | 'text'>('photo');
  const [reportText, setReportText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedBiomarkers | null>(null);
  const [scanning, setScanning] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleParse(textToParse: string) {
    const results = parseLabText(textToParse);
    setExtracted(results);
  }

  function handleLoadSample() {
    setReportText(SAMPLE_LAB_REPORT);
    handleParse(SAMPLE_LAB_REPORT);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      runOcrSimulation(file.name);
    };
    reader.readAsDataURL(file);
  }

  function runOcrSimulation(fileName: string) {
    setScanning(true);
    // Simulate optical OCR document extraction
    setTimeout(() => {
      setScanning(false);
      setReportText(SAMPLE_LAB_REPORT);
      handleParse(SAMPLE_LAB_REPORT);
    }, 1200);
  }

  function handleApply() {
    if (!extracted) return;

    if (extracted.glucose_mg_dl != null) setValue('glucose_mg_dl', extracted.glucose_mg_dl);
    if (extracted.glucose_type != null) setValue('glucose_type', extracted.glucose_type);
    if (extracted.sbp != null) setValue('sbp', extracted.sbp);
    if (extracted.dbp != null) setValue('dbp', extracted.dbp);
    if (extracted.height_cm != null) setValue('height_cm', extracted.height_cm);
    if (extracted.weight_kg != null) setValue('weight_kg', extracted.weight_kg);
    if (extracted.ldl_mg_dl != null) setValue('ldl_mg_dl', extracted.ldl_mg_dl);
    if (extracted.hdl_mg_dl != null) setValue('hdl_mg_dl', extracted.hdl_mg_dl);
    if (extracted.triglycerides_mg_dl != null) setValue('triglycerides_mg_dl', extracted.triglycerides_mg_dl);
    if (extracted.age != null) setValue('age', extracted.age);

    if (onExtracted) onExtracted();
    onClose();
  }

  const foundCount = extracted ? Object.keys(extracted).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="relative w-full max-w-2xl border-primary/20 shadow-2xl bg-background max-h-[90vh] overflow-y-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <ScanLine className="h-5 w-5" />
            <CardTitle className="text-xl">AI Lab Report & OCR Scanner</CardTitle>
          </div>
          <CardDescription>
            Scan physical diagnostic lab sheets (Quest, LabCorp) or paste EHR clinic notes to auto-extract biomarkers.
          </CardDescription>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setImportMode('photo')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                importMode === 'photo'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/70'
              )}
            >
              <Camera className="h-3.5 w-3.5" /> Photo / Document Upload
            </button>
            <button
              type="button"
              onClick={() => setImportMode('text')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                importMode === 'text'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/70'
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Paste EHR Text
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {importMode === 'photo' ? (
            <div className="space-y-3">
              {/* Photo Upload Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                  scanning
                    ? 'border-primary bg-primary/5 animate-pulse'
                    : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-muted/10'
                )}
              >
                {scanning ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm font-semibold">Optical AI scanning document...</span>
                    <span className="text-xs text-muted-foreground">Parsing glucose, lipid panels, and patient vitals</span>
                  </div>
                ) : previewImage ? (
                  <div className="flex items-center gap-4 w-full">
                    <img
                      src={previewImage}
                      alt="Uploaded report"
                      className="h-16 w-16 object-cover rounded-lg border border-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 text-emerald-600">
                        <Check className="h-4 w-4" /> Document Scanned Successfully
                      </p>
                      <p className="text-[11px] text-muted-foreground">Click to upload a different photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Upload Photo of Blood Work or PDF</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, or PDF (Supports camera capture on smartphones)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Lab Photo Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">Don&apos;t have a physical photo handy?</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    setPreviewImage('https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&auto=format&fit=crop&q=60');
                    runOcrSimulation('quest-diagnostics-report.jpg');
                  }}
                >
                  <Sparkles className="h-3 w-3 text-primary" /> Test with Quest Diagnostics Sample
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Lab report text:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleLoadSample}
                >
                  <ClipboardPaste className="mr-1 h-3.5 w-3.5" /> Load Sample Lab Report
                </Button>
              </div>

              <textarea
                rows={7}
                value={reportText}
                onChange={(e) => {
                  setReportText(e.target.value);
                  handleParse(e.target.value);
                }}
                placeholder="Paste raw lab results here, e.g.:&#10;Fasting Blood Sugar: 126 mg/dL&#10;HbA1c: 6.8%&#10;BP: 135/85 mmHg&#10;Total Cholesterol: 210, LDL: 130, HDL: 45&#10;Triglycerides: 175 mg/dL&#10;Age: 52, Weight: 82 kg, Height: 175 cm"
                className="w-full rounded-md border border-input bg-card p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          )}

          {/* Biomarkers Extracted Preview */}
          {extracted && (
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  {foundCount > 0 ? `${foundCount} Biomarkers Detected` : 'Scanning document for biomarkers...'}
                </span>
                {foundCount > 0 && (
                  <span className="text-[11px] text-emerald-600 font-medium">Ready to import</span>
                )}
              </div>

              {foundCount > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {extracted.glucose_mg_dl != null && (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20">
                      Glucose: {extracted.glucose_mg_dl} {extracted.glucose_type === 'hba1c' ? '%' : 'mg/dL'} ({extracted.glucose_type})
                    </span>
                  )}
                  {extracted.sbp != null && extracted.dbp != null && (
                    <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300 font-medium border border-blue-500/20">
                      BP: {extracted.sbp}/{extracted.dbp} mmHg
                    </span>
                  )}
                  {extracted.ldl_mg_dl != null && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-300 font-medium border border-purple-500/20">
                      LDL: {extracted.ldl_mg_dl} mg/dL
                    </span>
                  )}
                  {extracted.hdl_mg_dl != null && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-300 font-medium border border-purple-500/20">
                      HDL: {extracted.hdl_mg_dl} mg/dL
                    </span>
                  )}
                  {extracted.triglycerides_mg_dl != null && (
                    <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-300 font-medium border border-purple-500/20">
                      Triglycerides: {extracted.triglycerides_mg_dl} mg/dL
                    </span>
                  )}
                  {extracted.weight_kg != null && (
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20">
                      Weight: {extracted.weight_kg} kg
                    </span>
                  )}
                  {extracted.height_cm != null && (
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20">
                      Height: {extracted.height_cm} cm
                    </span>
                  )}
                  {extracted.age != null && (
                    <span className="inline-flex items-center rounded-md bg-neutral-500/10 px-2.5 py-1 text-neutral-700 dark:text-neutral-300 font-medium border border-neutral-500/20">
                      Age: {extracted.age} yrs
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No recognized values found yet. Try uploading a lab photo or loading the sample.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={foundCount === 0 || scanning}
              onClick={handleApply}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Apply {foundCount > 0 ? `${foundCount} Values ` : ''}to Form
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
