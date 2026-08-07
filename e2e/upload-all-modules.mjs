import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@bristi.com';
const ADMIN_PASSWORD = 'Admin@123';

let sharp = null;
try { sharp = (await import('sharp')).default; } catch {}

async function makePng() {
  if (sharp) {
    return sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 180, g: 40, b: 80, alpha: 1 } } }).png().toBuffer();
  }
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
}
async function makeSvg() {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#b42850"/></svg>');
}

const results = [];

const MODULES = [
  { label: 'Products', url: '/products/create' },
  { label: 'Categories', url: '/categories/create' },
  { label: 'Collections', url: '/collections/create' },
  { label: 'Blog', url: '/blogs/create' },
  { label: 'CMS Pages', url: '/pages/create' },
  { label: 'Visual Builder (Hero/Campaign/Homepage)', url: '/visual-builder?page=homepage' },
  { label: 'Theme Editor (logo)', url: '/theme/editor' },
  { label: 'Theme Navbar (logo)', url: '/theme/navbar' },
  { label: 'Theme Footer', url: '/theme/footer' },
  { label: 'Theme SEO', url: '/theme/seo' },
  { label: 'Settings (logo/favicon)', url: '/settings' },
];

async function login(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('form input[type="email"]', { timeout: 20000 });
  await page.fill('form input[type="email"]', ADMIN_EMAIL);
  await page.fill('form input[type="password"]', ADMIN_PASSWORD);
  await page.click('form button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 });
  await page.waitForTimeout(1500);
}

async function uploadedPreviewCount(page) {
  return page.evaluate(() => {
    let n = 0;
    document.querySelectorAll('img').forEach((img) => {
      const src = (img.currentSrc || img.src || '') + '';
      if (src.includes('/uploads/')) n++;
    });
    return n;
  });
}

function makeTracker(page) {
  const events = [];
  const handler = (resp) => {
    const url = resp.url();
    if (/\/api\/media/.test(url) && ['POST'].includes(resp.request().method())) {
      events.push({ status: resp.status(), url: url.replace(/\?.*$/, '') });
    }
  };
  page.on('response', handler);
  return {
    events,
    count: () => events.length,
    okCount: () => events.filter((e) => e.status >= 200 && e.status < 300).length,
    failed: () => events.filter((e) => e.status >= 400),
    detach: () => page.off('response', handler),
  };
}

async function uploadOnPage(page, tracker, fileBuffer, fileExt, mime) {
  const file = { name: `ui-test-${Date.now()}.${fileExt}`, mimeType: mime, buffer: fileBuffer };
  let inputs = page.locator('input[type="file"]');
  let count = await inputs.count();
  if (count === 0) {
    const uploadBtn = page.locator('button:has-text("Upload image"), button:has-text("Add image"), button:has-text("Choose image")').first();
    if (await uploadBtn.count()) {
      await uploadBtn.click();
      await page.waitForTimeout(1000);
      inputs = page.locator('input[type="file"]');
      count = await inputs.count();
    }
  }
  if (count === 0) return { status: 'NO_INPUT' };
  const beforeOk = tracker.okCount();
  await inputs.first().setInputFiles(file);
  await page.waitForTimeout(9000);
  const okGained = tracker.okCount() - beforeOk;
  const prev = await uploadedPreviewCount(page);
  const body = await page.evaluate(() => document.body.innerText);
  const successToast = /Image uploaded|Uploaded|uploaded successfully|replaced/i.test(body);
  const errorShown = body.includes('A file is required');
  const ok = okGained > 0;
  return {
    status: errorShown ? 'FAIL' : ok ? 'PASS' : 'NO_2XX',
    requests: tracker.count(),
    responses: tracker.events.map((e) => `${e.status}`).join(','),
    previews: prev,
    successToast,
    errorShown,
  };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await login(page);

  // ---- 1. Media Library ----
  await page.goto(`${ADMIN}/media`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  const libTracker = makeTracker(page);
  const beforeCount = await uploadedPreviewCount(page);
  const libInput = page.locator('input[type="file"]').first();
  await libInput.setInputFiles({ name: `lib-test-${Date.now()}.png`, mimeType: 'image/png', buffer: await makePng() });
  await page.waitForTimeout(9000);
  const afterCount = await uploadedPreviewCount(page);
  const libOk = libTracker.okCount() > 0;
  results.push({ module: 'Media Library', status: libOk ? 'PASS' : 'NO_RESPONSE', requests: libTracker.count(), before: beforeCount, after: afterCount });
  libTracker.detach();

  // ---- 2. Per-module uploads ----
  for (const m of MODULES) {
    await page.goto(`${ADMIN}${m.url}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    if (m.label.startsWith('Visual Builder')) {
      const campaignRow = page.locator('div.cursor-pointer', { hasText: 'Campaign Banner' }).first();
      if (await campaignRow.count()) {
        await campaignRow.click();
        await page.waitForTimeout(1000);
      }
      const newBanner = page.locator('button:has-text("New Banner")').first();
      if (await newBanner.count()) {
        await newBanner.click();
        await page.waitForTimeout(800);
        const confirm = page.locator('button:has-text("Add Banner")').first();
        if (await confirm.count()) {
          await confirm.click();
          await page.waitForTimeout(1500);
        }
      }
    }
    const tracker = makeTracker(page);
    const r = await uploadOnPage(page, tracker, await makePng(), 'png', 'image/png');
    tracker.detach();
    results.push({ module: m.label, ...r });
  }

  // ---- 2b. Visual Builder — Hero set upload ----
  await page.goto(`${ADMIN}/visual-builder?page=homepage`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  const heroRow = page.locator('div.cursor-pointer', { hasText: 'Hero' }).first();
  let heroStatus = 'NO_INPUT';
  let heroRequests = 0;
  if (await heroRow.count()) {
    await heroRow.click();
    await page.waitForTimeout(1000);
    const newSet = page.locator('button:has-text("New Set")').first();
    if (await newSet.count()) {
      await newSet.click();
      await page.waitForTimeout(800);
      const confirm = page.locator('button:has-text("Add Set")').first();
      if (await confirm.count()) {
        await confirm.click();
        await page.waitForTimeout(1500);
        const heroTracker = makeTracker(page);
        const hr = await uploadOnPage(page, heroTracker, await makePng(), 'png', 'image/png');
        heroTracker.detach();
        heroStatus = hr.status;
        heroRequests = hr.requests ?? 0;
      }
    }
  }
  results.push({ module: 'Visual Builder — Hero set (HeroSetModal)', status: heroStatus, requests: heroRequests });

  // ---- 3. SVG upload (format coverage) ----
  await page.goto(`${ADMIN}/blogs/create`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  const svgTracker = makeTracker(page);
  const svgR = await uploadOnPage(page, svgTracker, await makeSvg(), 'svg', 'image/svg+xml');
  svgTracker.detach();
  results.push({ module: 'Blog (SVG format)', ...svgR });

  // ---- 4. Oversized file (error message quality) ----
  await page.goto(`${ADMIN}/products/create`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);
  const bigTracker = makeTracker(page);
  const bigR = await uploadOnPage(page, bigTracker, Buffer.alloc(30 * 1024 * 1024), 'png', 'image/png');
  bigTracker.detach();
  const bigBody = await page.evaluate(() => document.body.innerText);
  const meaningfulError = /too large|exceeds|limit/i.test(bigBody);
  results.push({ module: 'Oversized file rejection', ...bigR, meaningfulError });

  console.log('\n===== UPLOAD RESULTS =====');
  let pass = 0, fail = 0, other = 0;
  for (const r of results) {
    const line = `${String(r.status).padEnd(12)} ${r.module}${r.responses !== undefined ? `  (POSTs:${r.requests ?? '?'}, statuses:${r.responses}, previews:${r.previews ?? '?'})` : ''}`;
    console.log(line);
    if (r.status === 'PASS') pass++;
    else if (r.status === 'FAIL') fail++;
    else other++;
  }
  console.log(`\nPASS: ${pass}  FAIL: ${fail}  OTHER: ${other}`);
  fs.writeFileSync(path.join(__dirname, 'upload-results.json'), JSON.stringify({ results }, null, 2));

  await browser.close();
})().catch((e) => { console.error('TEST ERROR:', e); process.exit(1); });
