// The liquid-biopsy demo (/demo) with the analysis API mocked: sign-in, file
// checks, the sample buttons, the five dashboard tabs and how each server
// error is presented. e2e/backend.spec.js runs the same flow against the
// real backend.
import { test, expect } from '@playwright/test';
import { buildMockAnalysis } from '../src/features/liquidbiopsy/mockData.js';
import { DESKTOP, PHONE, blockExternal, trackErrors } from './helpers.js';

const TABS = ['Doctor Summary', 'Variant Analysis', 'VAF & Risk', 'Drug Resistance', 'Technical Report'];
const VCF = '##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n7\t140753336\t.\tA\tT\t.\tPASS\t.\n';
const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
// Status codes the browser itself logs for the deliberate failures below.
const EXPECTED_HTTP_ERRORS = [/the server responded with a status of (400|401|413|422|429|500)/];

/** Mocks sign-in (accepting only `password`) and the analysis endpoint. */
async function mockApi(page, analyze) {
  await page.route('**/api/v1/auth/verify', (route) => {
    const auth = route.request().headers().authorization || '';
    const [, password] = Buffer.from(auth.replace(/^Basic /, ''), 'base64').toString().split(':');
    return route.fulfill(password === 'correct-horse-battery' ? json(200, { ok: true }) : json(401, {
      error_kind: 'unauthorized', message: 'Invalid demo credentials.',
    }));
  });
  await page.route('**/api/v1/vcf/analyze', analyze);
}

async function signIn(page, password = 'correct-horse-battery') {
  await page.fill('#lb-auth-username', 'tester');
  await page.fill('#lb-auth-password', password);
  await page.locator('button[type=submit]').click();
}

async function upload(page, file = { name: 'tiny.vcf', mimeType: 'text/plain', buffer: Buffer.from(VCF) }) {
  await page.setInputFiles('#vcf-input', file);
  await page.selectOption('#ref-build', 'GRCh38');
  await page.getByText('Get Your AI Report').click();
}

test.beforeEach(async ({ page, baseURL }) => blockExternal(page, baseURL));

for (const viewport of [DESKTOP, PHONE]) {
  test(`sign in, analyse, and read every tab (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = trackErrors(page, { ignore: EXPECTED_HTTP_ERRORS });
    await mockApi(page, (route) => route.fulfill(json(200, buildMockAnalysis())));
    await page.goto('/demo', { waitUntil: 'networkidle' });

    await signIn(page, 'wrong-password');
    await expect(page.getByRole('alert')).toContainText("That username or password isn't right.");
    await signIn(page);
    await expect(page.locator('#vcf-input')).toBeAttached();
    // The credential lives in memory only.
    expect(await page.evaluate(() => sessionStorage.length + localStorage.length)).toBe(0);

    await upload(page);
    // The dashboard is up (its "Analysis Complete" badge is hidden on phones).
    await expect(page.getByRole('button', { name: 'Start a new analysis' })).toBeVisible({ timeout: 15_000 });
    // A sidebar on wide screens, a bottom tab bar below 900px.
    const nav = viewport === PHONE ? page.getByRole('navigation', { name: 'Primary' }) : page.locator('aside');
    for (const tab of TABS) {
      await nav.getByRole('button', { name: tab, exact: true }).click();
      await page.waitForTimeout(300);
      const text = await page.locator('main').innerText();
      expect(text.length, `${tab} has content`).toBeGreaterThan(200);
    }
    expect(errors).toEqual([]);
  });
}

test('rejects files that are not VCFs before uploading them', async ({ page }) => {
  let uploads = 0;
  await mockApi(page, (route) => { uploads++; return route.fulfill(json(200, buildMockAnalysis())); });
  await page.goto('/demo', { waitUntil: 'networkidle' });
  await signIn(page);
  await page.setInputFiles('#vcf-input', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByText("This doesn't look like a .vcf or .vcf.gz file.")).toBeVisible();
  await page.setInputFiles('#vcf-input', { name: 'empty.vcf', mimeType: 'text/plain', buffer: Buffer.alloc(0) });
  await expect(page.getByText('This file is empty')).toBeVisible();
  expect(uploads).toBe(0);
});

test('sample buttons choose each sample\'s own genome build', async ({ page }) => {
  await mockApi(page, (route) => route.fulfill(json(200, buildMockAnalysis())));
  await page.goto('/demo', { waitUntil: 'networkidle' });
  await signIn(page);
  for (const [label, build] of [['Small panel (S5)', 'GRCh38'], ['IonXpress panel', 'GRCh37'], ['Robin panel', 'GRCh38']]) {
    await page.getByText('Sample Files', { exact: true }).click();
    await page.getByRole('button', { name: new RegExp(label.replace(/[()]/g, '\\$&')) }).click();
    await expect(page.locator('#ref-build')).toHaveValue(build);
  }
});

// What the user sees for each failure the server (or nginx) can return.
const FAILURES = [
  ['wrong genome build', json(422, {
    error_kind: 'reference_build_mismatch',
    message: "This file's reference bases don't match GRCh38 / hg38, the build selected for it.",
  }), "Reference build doesn't match"],
  ['build not stated', json(422, { error_kind: 'reference_build_unresolved', message: 'Please resubmit specifying the build.' }), 'Reference build needed'],
  ['malformed file', json(400, { error_kind: 'malformed_vcf', message: 'Bad header.' }), "Couldn't read this file"],
  ['pipeline failure', json(500, { error_kind: 'annotation_failure', message: 'Stage failed.' }), 'Analysis pipeline failed'],
  ['nginx rate limit', { status: 429, contentType: 'text/html', body: '<html>429</html>' }, 'Too many requests right now'],
  ['nginx size limit', { status: 413, contentType: 'text/html', body: '<html>413</html>' }, 'too large to upload'],
];
for (const [name, response, shown] of FAILURES) {
  test(`shows a clear message for: ${name}`, async ({ page }) => {
    const errors = trackErrors(page, { ignore: EXPECTED_HTTP_ERRORS });
    await mockApi(page, (route) => route.fulfill(response));
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await signIn(page);
    await upload(page);
    await expect(page.locator('body')).toContainText(shown);
    expect(errors).toEqual([]);
  });
}

test('a rejected credential mid-session returns to sign-in', async ({ page }) => {
  await mockApi(page, (route) => route.fulfill(json(401, { error_kind: 'unauthorized', message: 'Invalid demo credentials.' })));
  await page.goto('/demo', { waitUntil: 'networkidle' });
  await signIn(page);
  await upload(page);
  await expect(page.locator('body')).toContainText(/Session expired|sign in again/i);
});
