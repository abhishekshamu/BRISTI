import { chromium } from 'playwright';

const ORIGIN = process.env.TEST_ORIGIN || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const requests = [];
const cspErrors = [];
const pageErrors = [];
const failedResponses = [];
page.on('request', (r) => {
  const url = r.url();
  if (url.includes('/api/theme') || url.includes('/api/orders/track')) {
    requests.push({ url: url.replace(ORIGIN, ''), ts: Date.now() });
  }
});
page.on('console', (m) => {
  if (m.type() === 'error') {
    const t = m.text();
    if (t.includes('Content-Security-Policy') || t.includes('Refused to') || t.includes('unsafe-eval')) {
      cspErrors.push(t.slice(0, 200));
    }
  }
});
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('response', (r) => {
  if (r.status() >= 400) failedResponses.push(`${r.status()} ${r.url().replace(ORIGIN, '')}`);
});

const results = [];

await page.goto(`${ORIGIN}/track-order`, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(12000);
const themeReqs = requests.filter((r) => r.url.includes('/api/theme')).length;
results.push(['theme requested exactly once (12s watch)', themeReqs === 1, `count=${themeReqs}`]);

const input = page.locator('#order-number');
results.push(['input has id', (await input.count()) === 1]);
results.push(['input has name="orderNumber"', (await input.getAttribute('name')) === 'orderNumber']);
results.push(['label associated via htmlFor', (await page.locator('label[for="order-number"]').count()) === 1]);

await input.fill('BRS-NOTREAL-00000000');
await page.getByRole('button', { name: 'Track' }).click();
await page.waitForTimeout(1500);
let trackReqs = requests.filter((r) => r.url.includes('/api/orders/track')).length;
results.push(['track endpoint called exactly once per click', trackReqs === 1, `count=${trackReqs}`]);

const toastText = await page.locator('ol[data-sonner-toaster] li[data-sonner-toast]').first().textContent().catch(() => null);
results.push(['no-order toast shown', Boolean(toastText), toastText ?? 'none']);

await page.waitForTimeout(4000);
trackReqs = requests.filter((r) => r.url.includes('/api/orders/track')).length;
results.push(['no repeated/polled track calls (7s post-click)', trackReqs === 1, `count=${trackReqs}`]);

const unexpectedFailures = failedResponses.filter(
  (f) => !f.includes('/api/auth/me') && !f.includes('/api/users/profile') && !f.includes('/api/orders/track/BRS-NOTREAL'),
);
results.push(['no unexpected failed requests', unexpectedFailures.length === 0, unexpectedFailures.join(' | ') || 'clean']);
results.push(['no CSP violations', cspErrors.length === 0, cspErrors.join(' | ') || 'clean']);
results.push(['no page errors / render loops', pageErrors.length === 0, pageErrors.join(' | ') || 'clean']);

for (const [name, ok, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
await browser.close();
process.exit(results.every((r) => r[1]) ? 0 : 1);

