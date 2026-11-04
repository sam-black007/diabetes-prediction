'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { ClinicalRule, ScreeningResult } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#0f172a', backgroundColor: '#ffffff' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2 solid #0284c7', paddingBottom: 12, marginBottom: 14 },
  hospitalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0369a1', letterSpacing: 0.5 },
  docSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  docBadge: { backgroundColor: '#f0fdf4', border: '1 solid #86efac', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  docBadgeText: { fontSize: 8, color: '#166534', fontWeight: 'bold' },

  patientBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 14, border: '1 solid #e2e8f0' },
  patientItem: { fontSize: 8, color: '#475569' },
  patientVal: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },

  scoreBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', border: '1 solid #bae6fd', padding: 12, borderRadius: 6, marginBottom: 14 },
  scoreLeft: { width: '60%' },
  scoreTitle: { fontSize: 11, fontWeight: 'bold', color: '#0369a1', marginBottom: 2 },
  scoreDesc: { fontSize: 8, color: '#475569', lineHeight: 1.3 },
  scoreRight: { alignItems: 'flex-end' },
  scoreBig: { fontSize: 24, fontWeight: 'bold', color: '#0284c7' },
  scoreSub: { fontSize: 8, color: '#0369a1', fontWeight: 'bold' },

  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e293b', borderBottom: '1 solid #cbd5e1', paddingBottom: 3, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '1 solid #f1f5f9' },
  colMetric: { width: '30%', fontSize: 8, color: '#334155', fontWeight: 'bold' },
  colValue: { width: '22%', fontSize: 8, color: '#0f172a' },
  colRef: { width: '24%', fontSize: 8, color: '#64748b' },
  colStatus: { width: '24%', fontSize: 8, fontWeight: 'bold', textAlign: 'right' },

  planBox: { backgroundColor: '#fefce8', border: '1 solid #fef08a', padding: 10, borderRadius: 6, marginTop: 8, marginBottom: 12 },
  planTitle: { fontSize: 9, fontWeight: 'bold', color: '#854d0e', marginBottom: 3 },
  planText: { fontSize: 8, color: '#713f12', lineHeight: 1.4 },

  signSection: { marginTop: 18, borderTop: '1 solid #e2e8f0', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  signBlock: { width: '45%' },
  signLine: { borderBottom: '1 solid #94a3b8', height: 28, marginBottom: 4 },
  signLabel: { fontSize: 7.5, color: '#64748b', textTransform: 'uppercase' },

  footerDisclaimer: { marginTop: 16, fontSize: 7, color: '#94a3b8', lineHeight: 1.3, textAlign: 'center' },
});

function getMetricStatus(status?: string, severity?: string) {
  if (severity === 'critical' || severity === 'emergency' || status?.toLowerCase().includes('high')) return { text: status ?? 'High', color: '#b91c1c' };
  if (severity === 'prediabetes' || severity === 'stage1' || status?.toLowerCase().includes('prediabetes')) return { text: status ?? 'Elevated', color: '#d97706' };
  return { text: status ?? 'Normal Range', color: '#15803d' };
}

function ScreeningDocument({ result }: { result: ScreeningResult }) {
  const ml = result.ml_result;
  const mlScore = typeof ml?.risk_score === 'number' ? ml.risk_score : ml?.score;
  const dateStr = result.created_at ? new Date(result.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString();

  const inputBmi =
    result.input.height_cm && result.input.weight_kg
      ? (result.input.weight_kg / Math.pow(result.input.height_cm / 100, 2)).toFixed(1)
      : null;

  return (
    <Document title={`Clinical Report - ${result.id}`}>
      <Page size="A4" style={styles.page}>
        {/* Hospital Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.hospitalTitle}>DiabetesRisk Intelligence Clinical Assessment</Text>
            <Text style={styles.docSub}>Official ADA 2026 Diagnostic Standards · Clinical Protocol Report</Text>
            <Text style={styles.docSub}>Document Ref: DRI-{result.id.slice(0, 8).toUpperCase()} · Generated: {dateStr}</Text>
          </View>
          <View style={styles.docBadge}>
            <Text style={styles.docBadgeText}>CONFIDENTIAL MEDICAL RECORD</Text>
          </View>
        </View>

        {/* Patient Profile Bar */}
        <View style={styles.patientBar}>
          <View>
            <Text style={styles.patientItem}>Age / Gender</Text>
            <Text style={styles.patientVal}>{result.input.age != null ? `${result.input.age} yrs` : 'Unspecified'} · {result.input.sex ?? 'Not specified'}</Text>
          </View>
          <View>
            <Text style={styles.patientItem}>Body Mass Index (BMI)</Text>
            <Text style={styles.patientVal}>{inputBmi ? `${inputBmi} kg/m²` : 'Not recorded'}</Text>
          </View>
          <View>
            <Text style={styles.patientItem}>Family History</Text>
            <Text style={styles.patientVal}>{result.input.family_history ? 'Positive (+)' : 'Negative (-)'}</Text>
          </View>
          <View>
            <Text style={styles.patientItem}>Assessment Type</Text>
            <Text style={styles.patientVal}>Comprehensive Screening</Text>
          </View>
        </View>

        {/* Overall Health Score Banner */}
        <View style={styles.scoreBanner}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreTitle}>Cardiometabolic Risk Classification: {result.risk_category?.toUpperCase() ?? 'MODERATE'}</Text>
            <Text style={styles.scoreDesc}>
              Patient demonstrates {result.risk_category === 'low' ? 'optimal metabolic homeostasis with zero immediate diagnostic flags.' : 'identified metabolic risk factors requiring lifestyle intervention and diagnostic follow-up.'}
            </Text>
            {mlScore != null && (
              <Text style={[styles.scoreDesc, { marginTop: 3, fontWeight: 'bold' }]}>
                Ensemble Machine Learning Predicted Probability: {(mlScore * 100).toFixed(1)}%
              </Text>
            )}
          </View>
          <View style={styles.scoreRight}>
            <Text style={styles.scoreBig}>{result.health_score} <Text style={{ fontSize: 12 }}>/ 100</Text></Text>
            <Text style={styles.scoreSub}>METABOLIC HEALTH SCORE</Text>
          </View>
        </View>

        {/* Biomarkers Table */}
        <Text style={styles.sectionTitle}>Laboratory Biomarkers & Clinical Rules</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colMetric}>Metric</Text>
          <Text style={styles.colValue}>Observed Value</Text>
          <Text style={styles.colRef}>Standard Reference</Text>
          <Text style={styles.colStatus}>Clinical Finding</Text>
        </View>

        {/* Glucose */}
        {result.glucose_rules?.map((r, i) => {
          const status = getMetricStatus(r.status, r.severity);
          return (
            <View style={styles.tableRow} key={`g-${i}`}>
              <Text style={styles.colMetric}>Plasma Glucose ({r.measurement_type})</Text>
              <Text style={styles.colValue}>{r.value} {r.measurement_type === 'hba1c' ? '%' : 'mg/dL'}</Text>
              <Text style={styles.colRef}>{r.measurement_type === 'hba1c' ? '< 5.7%' : '< 100 mg/dL'}</Text>
              <Text style={[styles.colStatus, { color: status.color }]}>{status.text}</Text>
            </View>
          );
        })}

        {/* Blood Pressure */}
        {result.bp_rule && (
          <View style={styles.tableRow}>
            <Text style={styles.colMetric}>Blood Pressure (SBP/DBP)</Text>
            <Text style={styles.colValue}>{result.bp_rule.value} mmHg</Text>
            <Text style={styles.colRef}>&lt; 120 / 80 mmHg</Text>
            <Text style={[styles.colStatus, { color: getMetricStatus(result.bp_rule.status, result.bp_rule.severity).color }]}>
              {result.bp_rule.status ?? 'Normal'}
            </Text>
          </View>
        )}

        {/* BMI */}
        {result.bmi_rule && (
          <View style={styles.tableRow}>
            <Text style={styles.colMetric}>Body Mass Index (BMI)</Text>
            <Text style={styles.colValue}>{result.bmi_rule.value} kg/m²</Text>
            <Text style={styles.colRef}>18.5 – 24.9 kg/m²</Text>
            <Text style={[styles.colStatus, { color: getMetricStatus(result.bmi_rule.status, result.bmi_rule.severity).color }]}>
              {result.bmi_rule.status ?? 'Normal'}
            </Text>
          </View>
        )}

        {/* Lipid rules */}
        {result.lipid_rules?.map((r, i) => {
          const status = getMetricStatus(r.status, r.severity);
          return (
            <View style={styles.tableRow} key={`lip-${i}`}>
              <Text style={styles.colMetric}>{r.metric.toUpperCase()}</Text>
              <Text style={styles.colValue}>{r.value} mg/dL</Text>
              <Text style={styles.colRef}>Optimal Target</Text>
              <Text style={[styles.colStatus, { color: status.color }]}>{status.text}</Text>
            </View>
          );
        })}

        {/* Clinical Follow-up & Treatment Plan */}
        <Text style={styles.sectionTitle}>Recommended Clinical Follow-Up Protocol</Text>
        <View style={styles.planBox}>
          <Text style={styles.planTitle}>Action Timeline: {result.followup_schedule?.when ?? '3–6 Months'}</Text>
          <Text style={styles.planText}>{result.followup_schedule?.text ?? 'Patient advised to complete repeat diagnostic testing and initiate structured medical nutrition therapy.'}</Text>
        </View>

        {/* Physician Review & Signature Block */}
        <View style={styles.signSection}>
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Attending Physician Signature</Text>
          </View>
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Medical License / NPI Number & Date</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.footerDisclaimer}>
          NOTICE: This clinical document is a digital screening aid synthesized from validated ADA 2026 and AHA/ACC guidelines. It is intended for healthcare professional evaluation and patient longitudinal tracking. It does not replace individualized clinical judgment.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateScreeningPdf(result: ScreeningResult): Promise<Blob> {
  return await pdf(<ScreeningDocument result={result} />).toBlob();
}
