import { test, expect } from '@playwright/test';

test.describe('Diabetes Risk Intelligence — Clinical E2E Test Suite', () => {

  test('1. Landing Page & 5-Trials Free Demo Mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Metabolic Health & Diabetes Risk Evaluation System')).toBeVisible();

    // Verify 5-Trials Demo button exists
    const demoButton = page.locator('text=Try Free Demo (5 Free Trials)');
    await expect(demoButton).toBeVisible();

    // Launch demo mode
    await demoButton.click();
    await page.waitForURL(/.*mode=demo.*/);
    await expect(page.locator('text=Free Demo Mode')).toBeVisible();
  });

  test('2. Doctor Command Dashboard & Individual Patient Portfolio', async ({ page }) => {
    await page.goto('/doctor');
    await page.evaluate(() => localStorage.setItem('dri_user_role', 'doctor'));
    await page.reload();

    // Verify Doctor Console renders
    await expect(page.locator('text=Live Monitoring')).toBeVisible();
    await expect(page.locator('text=Active Patients')).toBeVisible();
    await expect(page.locator('text=Priority Patient Queue')).toBeVisible();

    // Click on patient row to open Patient Portfolio
    const patientRow = page.locator('text=Marcus Vance');
    await expect(patientRow).toBeVisible();
    await patientRow.click();

    // Verify Patient Portfolio details render
    await expect(page.locator('text=Individual Patient Portfolio')).toBeVisible();
    await expect(page.locator('text=Blood Glucose Profile')).toBeVisible();
    await expect(page.locator('text=Hemodynamics & BP')).toBeVisible();
    await expect(page.locator('text=South Asian Phenotype')).toBeVisible();
    await expect(page.locator('text=Dr. Charak AI Clinical Recommendation')).toBeVisible();

    // Return back to queue
    await page.locator('text=Back to Diagnostic Queue').click();
    await expect(page.locator('text=Priority Patient Queue')).toBeVisible();
  });

  test('3. Admin Command Center, Telemetry & Bug Test Engine', async ({ page }) => {
    await page.goto('/admin');
    await page.evaluate(() => localStorage.setItem('dri_user_role', 'admin'));
    await page.reload();

    // Verify Admin Telemetry renders without client crash
    await expect(page.locator('text=Admin Command Center & Telemetry')).toBeVisible();
    await expect(page.locator('text=System Uptime')).toBeVisible();
    await expect(page.locator('text=Edge API Latency')).toBeVisible();
    await expect(page.locator('text=Live Clinical Diagnostic & Bug Test Console')).toBeVisible();

    // Test Crisis Spike preset & verify execution
    await page.locator('text=Crisis Spike').click();
    const runBtn = page.locator('text=Run Diagnostic & Bug Test Engine');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify live bug engine pass indicator
    await expect(page.locator('text=TEST PASSED: HTTP 200 OK — ZERO EXCEPTIONS')).toBeVisible();
  });

  test('4. Clinical Biomarker Screening Evaluation', async ({ page }) => {
    await page.goto('/screening');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /screening/i })).toBeVisible();
  });

  test('5. Patient Screening Registry & Trend Charts', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('text=My Screening History & Graph')).toBeVisible();
  });

});
