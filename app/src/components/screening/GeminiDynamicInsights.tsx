'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';
import type { ScreeningResult } from '@/lib/types';
import {
  calculateIDRS,
  calculateTgHdlRatio,
  getAsianIndianBmiCategory,
} from '@/lib/indian-clinical';
import { cn } from '@/lib/utils';

export function GeminiDynamicInsights({ result }: { result: ScreeningResult }) {
  const [report, setReport] = useState<any>(null);

  const { input } = result;
  const bmi =
    input.height_cm && input.weight_kg
      ? parseFloat((input.weight_kg / Math.pow(input.height_cm / 100, 2)).toFixed(1))
      : 24.2;

  const idrs = calculateIDRS({
    age: input.age ?? 45,
    sex: (input.sex as 'M' | 'F') ?? 'M',
    activity: 'moderate',
    familyHistoryDiabeticParents: input.family_history ? 1 : 0,
  });

  const tgHdl = calculateTgHdlRatio(input.triglycerides_mg_dl, input.hdl_mg_dl);
  const asianBmi = getAsianIndianBmiCategory(bmi);
  const isHighRisk = idrs.score >= 60 || (input.glucose_mg_dl && input.glucose_mg_dl >= 140);

  useEffect(() => {
    async function loadAssessment() {
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientProfile: {
              glucose: input.glucose_mg_dl,
              glucoseType: input.glucose_type,
              sbp: input.sbp,
              dbp: input.dbp,
              bmi,
              age: input.age,
              sex: input.sex,
              familyHistory: input.family_history,
            },
            idrsScore: idrs.score,
            tgHdlRatio: tgHdl.ratio,
          }),
        });
        const resData = await res.json();
        if (resData.ok && resData.data) {
          setReport(resData.data);
        }
      } catch {
        // Fallback silently to ICMR rule-based data
      }
    }
    loadAssessment();
  }, [result]);

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      {/* Clinical Document Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Clinical Metabolic Evaluation
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                ICMR / RSSDI Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              South Asian Phenotype Triage & Diabetology Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Stratification:</span>
          <span
            className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-md',
              isHighRisk
                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
            )}
          >
            {isHighRisk ? 'High Metabolic Risk' : 'Moderate / Controlled'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Diagnostic Biomarker Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            1. Diagnostic Biomarker Matrix
          </h4>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Biomarker / Index</th>
                  <th className="py-2.5 px-3">Observed Value</th>
                  <th className="py-2.5 px-3">ICMR / WHO Target</th>
                  <th className="py-2.5 px-3">Clinical Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    Blood Glucose ({input.glucose_type ?? 'Fasting'})
                  </td>
                  <td className="py-2.5 px-3 font-bold">{input.glucose_mg_dl ?? 'N/A'} mg/dL</td>
                  <td className="py-2.5 px-3 text-slate-500">&lt; 100 mg/dL (Fasting)</td>
                  <td className="py-2.5 px-3">
                    <span className={cn('font-bold', (input.glucose_mg_dl ?? 0) >= 126 ? 'text-red-600' : 'text-emerald-600')}>
                      {(input.glucose_mg_dl ?? 0) >= 126 ? 'Diabetic Range' : (input.glucose_mg_dl ?? 0) >= 100 ? 'Impaired (Prediabetes)' : 'Normal'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    MDRF Indian Diabetes Risk Score (IDRS)
                  </td>
                  <td className="py-2.5 px-3 font-bold">{idrs.score} / 100</td>
                  <td className="py-2.5 px-3 text-slate-500">&lt; 30 (Low Risk)</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className={idrs.category === 'High' ? 'text-red-600' : idrs.category === 'Moderate' ? 'text-amber-600' : 'text-emerald-600'}>
                      {idrs.category} Risk ({idrs.score >= 60 ? '≥ 60 Cutoff' : 'Sub-threshold'})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    TG / HDL Ratio (Atherogenic Index)
                  </td>
                  <td className="py-2.5 px-3 font-bold">{tgHdl.ratio ? `${tgHdl.ratio}x` : 'Pending Lipids'}</td>
                  <td className="py-2.5 px-3 text-slate-500">&lt; 2.0 (Target for South Asians)</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className={tgHdl.status === 'Atherogenic Risk' ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}>
                      {tgHdl.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    Asian-Indian Specific BMI
                  </td>
                  <td className="py-2.5 px-3 font-bold">{bmi} kg/m²</td>
                  <td className="py-2.5 px-3 text-slate-500">18.0 - 22.9 kg/m²</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className={asianBmi.color}>{asianBmi.category}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    Blood Pressure Hemodynamics
                  </td>
                  <td className="py-2.5 px-3 font-bold">{input.sbp ?? 120} / {input.dbp ?? 80} mmHg</td>
                  <td className="py-2.5 px-3 text-slate-500">&lt; 120/80 mmHg</td>
                  <td className="py-2.5 px-3 font-bold">
                    <span className={(input.sbp ?? 120) >= 130 ? 'text-amber-600' : 'text-emerald-600'}>
                      {(input.sbp ?? 120) >= 130 ? 'Elevated SBP' : 'Optimal'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Summary Assessment */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
            2. Physician Clinical Triage & Risk Summary
          </h4>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {report?.clinicalTriage ||
              (isHighRisk
                ? 'Patient exhibits elevated risk markers consistent with the South Asian thin-fat metabolic phenotype. High IDRS score combined with current glycemic index warrants formal venous laboratory confirmation.'
                : 'Current biometric parameters indicate an optimal to borderline metabolic profile. Rescreening and prophylactic dietary adherence recommended.')}
          </p>
          {tgHdl.ratio && tgHdl.ratio >= 2.0 && (
            <p className="text-[11px] text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-2">
              <strong>Atherogenic Alert:</strong> TG/HDL ratio of {tgHdl.ratio}x indicates presence of small dense LDL (sdLDL) and visceral insulin resistance. Carbohydrate restriction is strongly indicated.
            </p>
          )}
        </div>

        {/* Nutritional Protocol (ICMR Food Matrix) */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            3. Prescribed South Asian Dietary Interventions (Millet Matrix)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Restricted Primary Staple</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">Polished White Rice (Sona Masuri / Ponni) & Maida</p>
                <p className="text-[11px] text-slate-500 mt-1">High glycemic index (>75) triggers rapid postprandial glucose surges.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Prescribed Clinical Substitute
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Foxtail (Kangni) / Barnyard (Sanwa) Millet or Multigrain Atta</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">Low GI (&lt;50), rich in slow-digesting resistant starch and beta-glucan fiber.</p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Restricted Snack / Fat Profile</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">Deep-Fried Vrat Items (Sabudana Vada, Pakoras, Namkeen)</p>
                <p className="text-[11px] text-slate-500 mt-1">Saturated fats combined with refined starches promote visceral adiposity.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Prescribed Clinical Substitute
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Roasted Bengal Gram (Chana) + Sprouted Moong + Fenugreek (Methi)</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">Promotes peripheral GLUT-4 translocation and blunts glycemic variability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmatory Lab Orders */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            4. Recommended Confirmatory Diagnostic Investigations
          </h4>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'Venous Fasting Plasma Glucose (FPG) + 75g 2-Hr OGTT',
                'Venous HbA1c via NGSP-Certified HPLC method',
                'Complete Fasting Lipid Panel (Triglycerides, HDL-C, sdLDL)',
                'Urinary Albumin-to-Creatinine Ratio (uACR) & eGFR',
              ].map((order, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{order}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
