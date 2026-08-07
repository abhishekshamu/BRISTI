import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'shots');
const STORE = process.env.STORE_URL || 'http://localhost:3004';
const ADMIN = process.env.ADMIN_URL || 'http://localhost:3003';
const API = process.env.API_URL || 'http://localhost:5000/api';
const VIEWPORTS = [1920, 1600, 1440, 1366, 1280, 1024, 768, 480];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bristi.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const report = [];
const consoleErrors = [];

const writeReport = (interactions = null) => {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(interactions ? { report, interactions } : { report, interactions: {} }, null, 2));
  console.log(`  ...checkpoint saved (${report.length} entries)`);
};

const safe = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}

async function getSlugs() {
  const slugs = { product: null, category: null, collection: null, blog: null, productId: null };
  const p = await fetchJson(`${API}/products?limit=1`);
  slugs.product = p.data?.data?.[0]?.slug ?? null;
  slugs.productId = p.data?.data?.[0]?._id ?? null;
  const c = await fetchJson(`${API}/categories`);
  slugs.category = c.data?.data?.[0]?.slug ?? null;
  const co = await fetchJson(`${API}/collections`);
  slugs.collection = co.data?.data?.[0]?.slug ?? null;
  const b = await fetchJson(`${API}/blogs`);
  slugs.blog = b.data?.data?.[0]?.slug ?? null;
  return slugs;
}

async function checkPage(page, url, label, width, opts = {}) {
  const errors = [];
  const failedReq = [];
  const failedHttp = [];
  let pageError = null;
  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // "Failed to load resource" duplicates HTTP status noise; real API
      // failures are captured via the response listener instead.
      if (/Failed to load resource/.test(t)) return;
      errors.push(t.slice(0, 400));
    }
  };
  const onPageError = (err) => { pageError = String(err); };
  const onRequestFailed = (req) => {
    const u = req.url();
    if (/unsplash|images\.|fonts\.|favicon/.test(u)) return;
    failedReq.push(`${req.failure()?.errorText ?? 'fail'} ${u}`);
  };
  const onResponse = (resp) => {
    const status = resp.status();
    if (status < 400 || /favicon/.test(resp.url())) return;
    const url = resp.url().replace(/\?.*$/, '');
    // Expected anonymous probes when not logged in (no session cookie present).
    if (status === 401 && /\/api\/(auth\/me|users\/profile|admin\/me)(\?|$)/.test(url)) return;
    // Expected: the storefront interceptor's refresh attempt when no session exists.
    if (status === 400 && /\/api\/auth\/refresh-token(\?|$)/.test(url)) return;
    failedHttp.push(`${status} ${url}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    status = resp?.status() ?? 0;
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    } catch (e2) {
      errors.push(`NAVIGATION FAILED: ${e2.message.split('\n')[0]}`);
    }
  }
  await page.waitForTimeout(1200);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const overflowY = doc.scrollHeight - doc.clientHeight;
    const brokenImgs = [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src || '').slice(0, 200));
    const forms = document.querySelectorAll('form').length;
    const inputs = document.querySelectorAll('input, select, textarea').length;
    const tables = document.querySelectorAll('table').length;
    const canvases = [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, rw: c.getBoundingClientRect().width, rh: c.getBoundingClientRect().height }));
    const bodyText = document.body.innerText.length;
    return { overflowX, overflowY, brokenImgs, forms, inputs, tables, canvases, bodyText };
  });

  const shotDir = path.join(OUT, String(width));
  fs.mkdirSync(shotDir, { recursive: true });
  const shot = path.join(shotDir, `${safe(label)}.png`);
  try { await page.screenshot({ path: shot, fullPage: true }); } catch (e) { errors.push(`SHOT FAILED: ${e.message.slice(0, 120)}`); }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);

  const entry = {
    width, label, url, status,
    overflowX: metrics.overflowX,
    overflowY: metrics.overflowY,
    brokenImages: metrics.brokenImgs.length,
    brokenImageUrls: metrics.brokenImgs.slice(0, 5),
    consoleErrors: errors.slice(0, 5),
    pageError,
    failedRequests: failedReq.slice(0, 5),
    failedHttp: failedHttp.slice(0, 8),
    forms: metrics.forms, inputs: metrics.inputs, tables: metrics.tables,
    canvases: metrics.canvases,
    shot,
  };
  report.push(entry);
  const issues = [];
  if (entry.overflowX > 2) issues.push(`OVERFLOW-X +${entry.overflowX}px`);
  if (metrics.brokenImgs.length) issues.push(`${metrics.brokenImgs.length} BROKEN IMG`);
  if (errors.length) issues.push(`${errors.length} CONSOLE ERR`);
  if (pageError) issues.push('PAGE ERROR');
  if (failedReq.length) issues.push(`${failedReq.length} FAILED REQ`);
  if (failedHttp.length) issues.push(`HTTP ${failedHttp.length}`);
  if (issues.length) console.log(`  [${width}px] ${label}: ${issues.join(' | ')} ${failedHttp.slice(0,3).join(';')}`);
  return entry;
}

async function storefrontTest(browser, slugs) {
  const routes = [
    ['/home', '/'],
    ['/shop', '/shop'],
    ['/search', '/search?q=shirt'],
    ['/collections', '/collections'],
    ['/new-arrivals', '/new-arrivals'],
    ['/sale', '/sale'],
    ['/best-sellers', '/best-sellers'],
    ['/trending', '/trending'],
    ['/featured', '/featured'],
    ['/recommended', '/recommended'],
    ['/luxury-collection', '/luxury-collection'],
    ['/journal', '/journal'],
    ['/about', '/about'],
    ['/contact', '/contact'],
    ['/privacy', '/privacy'],
    ['/terms', '/terms'],
    ['/shipping', '/shipping'],
    ['/refund', '/refund'],
    ['/faq', '/faq'],
    ['/cart', '/cart'],
    ['/wishlist', '/wishlist'],
    ['/checkout', '/checkout'],
    ['/track-order', '/track-order'],
    ['/login', '/login'],
    ['/register', '/register'],
    ['/forgot-password', '/forgot-password'],
    ['/404', '/definitely-not-a-real-page-xyz'],
  ];
  if (slugs.product) routes.push(['/product', `/product/${slugs.product}`]);
  if (slugs.category) routes.push(['/category', `/category/${slugs.category}`]);
  if (slugs.collection) routes.push(['/collection', `/collection/${slugs.collection}`]);
  if (slugs.blog) routes.push(['/blog', `/journal/${slugs.blog}`]);

  for (const width of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    console.log(`\n=== STOREFRONT @ ${width}px ===`);
    for (const [label, route] of routes) {
      await checkPage(page, STORE + route, label, width);
    }
    writeReport();
    await context.close();
  }
}

async function adminTest(browser) {
  for (const width of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    console.log(`\n=== ADMIN @ ${width}px ===`);
    await checkPage(page, `${ADMIN}/login`, 'login', width, { ignoreNet: true });

    // Login via UI (exercises the real form + CSRF cookie flow)
    try {
      await page.waitForSelector('form input[type="email"]', { timeout: 15000 });
      await page.fill('form input[type="email"]', ADMIN_EMAIL);
      await page.fill('form input[type="password"]', ADMIN_PASSWORD);
      await Promise.all([
        page.waitForURL('**/login*', { timeout: 15000 }).catch(() => {}),
        page.click('form button[type="submit"]'),
      ]);
      await page.waitForTimeout(2500);
      const loggedIn = page.url().endsWith('/') || page.url().includes('3003');
      if (!loggedIn) console.log(`  [${width}px] LOGIN may have failed, url=${page.url()}`);
    } catch (e) {
      console.log(`  [${width}px] LOGIN FAILED: ${e.message.split('\n')[0]}`);
    }

    // Product id for edit page
    let productId = null;
    try {
      const resp = await page.request.get(`${API}/products?limit=1`);
      const json = await resp.json();
      productId = json?.data?.[0]?._id ?? null;
    } catch {}

    const routes = [
      ['dashboard', '/'],
      ['analytics', '/analytics'],
      ['products', '/products'],
      ['products-create', '/products/create'],
      ['categories', '/categories'],
      ['collections', '/collections'],
      ['coupons', '/coupons'],
      ['orders', '/orders'],
      ['customers', '/customers'],
      ['inventory', '/inventory'],
      ['media', '/media'],
      ['pages', '/pages'],
      ['blogs', '/blogs'],
      ['faqs', '/faqs'],
      ['messages', '/messages'],
      ['promotion-banners', '/promotion-banners'],
      ['theme-homepage', '/theme/homepage-builder'],
      ['theme-pagebuilder', '/theme/page-builder'],
      ['theme-editor', '/theme/editor'],
      ['theme-typography', '/theme/typography'],
      ['theme-navbar', '/theme/navbar'],
      ['theme-footer', '/theme/footer'],
      ['theme-announcement', '/theme/announcement'],
      ['theme-seo', '/theme/seo'],
      ['notifications', '/notifications'],
      ['settings', '/settings'],
      ['roles', '/roles'],
      ['audit', '/audit'],
      ['account', '/account'],
    ];
    if (productId) routes.push(['product-edit', `/products/${productId}/edit`]);

    for (const [label, route] of routes) {
      await checkPage(page, ADMIN + route, `admin-${label}`, width);
    }
    writeReport();
    await context.close();
  }
}

async function interactionTests(browser, slugs) {
  const results = {};
  const width = 1440;
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('TIMEOUT'), ms))]);

  // 1. Mobile nav hamburger
  for (const w of [768, 480]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(STORE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);
    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i], [data-testid="mobile-menu"]').first();
    if (await menuButton.count()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      const visibleLinks = await page.locator('a:visible').count();
      results[`mobile-nav-${w}`] = { menuFound: true, visibleLinks };
      await page.screenshot({ path: path.join(OUT, `${w}`, `interaction-mobile-menu.png`), fullPage: true });
    } else {
      results[`mobile-nav-${w}`] = { menuFound: false };
    }
  }

  // 2. Contact form
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto(`${STORE}/contact`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  const contactOk = await page.locator('form').first().count();
  if (contactOk) {
    const inputs = page.locator('form').first().locator('input, textarea');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type');
      if (type === 'email') await input.fill('tester@example.com');
      else if (type === 'tel') await input.fill('+1 555 0100');
      else await input.fill('UI Tester');
    }
    await page.locator('form').first().locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    const postOk = await fetchJson(`${API}/contact`, { method: 'GET' }).catch(() => null);
    const successText = await page.locator('text=/thank|success|received/i').first().count();
    results.contact = { submitted: true, successText };
  } else {
    results.contact = { submitted: false };
  }

  // 3. Newsletter (footer)
  await page.goto(STORE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  const newsInput = page.locator('input[type="email"]').last();
  if (await newsInput.count()) {
    await newsInput.fill(`newsletter-${Date.now()}@example.com`);
    const btn = page.locator('button[aria-label="Subscribe to newsletter"], button:has-text("Subscribe")').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1500);
      results.newsletter = { attempted: true, toast: await page.locator('text=/subscribed|thank|success/i').first().count() };
    } else results.newsletter = { attempted: true, toast: -1 };
  } else results.newsletter = { attempted: false };

  // 4. Login failure shows error (customer)
  await page.goto(`${STORE}/login`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  const emailF = page.locator('form input[type="email"]').first();
  if (await emailF.count()) {
    await emailF.fill('no-such-user@example.com');
    await page.locator('form input[type="password"]').first().fill('WrongPass1');
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    results.loginFailure = { errorShown: (await page.locator('text=/invalid|incorrect|error/i').first().count()) > 0 };
  } else results.loginFailure = { errorShown: null };

  // 5. Product page: add to cart + 3D viewer lazy-load
  if (slugs.product) {
    await page.goto(`${STORE}/product/${slugs.product}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const addBtn = page.locator('button:has-text("Add to bag"), button:has-text("Add to cart")').first();
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(1500);
      results.addToCart = { attempted: true, toast: (await page.locator('text=/added|bag|cart/i').first().count()) > 0 };
    } else results.addToCart = { attempted: false };
    // 3D viewer
    const threeBtn = page.locator('button:has-text("3D"), button:has-text("View 3D"), [role="tab"]:has-text("3D")').first();
    if (await threeBtn.count()) {
      await withTimeout(threeBtn.click(), 5000);
      await page.waitForTimeout(6000);
      const canvas = await withTimeout(page.locator('canvas').first().count(), 3000);
      results.threeViewer = { clicked: true, canvas };
      await page.screenshot({ path: path.join(OUT, '1920', 'interaction-3d-viewer.png') }).catch(() => {});
    } else results.threeViewer = { clicked: false };
  }

  // 6. Admin media upload
  const adminContext = await browser.newContext({ viewport: { width: 1920, height: 900 } });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${ADMIN}/login`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  try {
    await adminPage.waitForSelector('form input[type="email"]', { timeout: 15000 });
    await adminPage.fill('form input[type="email"]', ADMIN_EMAIL);
    await adminPage.fill('form input[type="password"]', ADMIN_PASSWORD);
    await adminPage.click('form button[type="submit"]');
    await adminPage.waitForTimeout(2500);
  } catch (e) { results.mediaUpload = { loginFailed: true }; }
  await adminPage.goto(`${ADMIN}/media`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await adminPage.waitForTimeout(1500);
  const fileInput = adminPage.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const tmp = path.join(OUT, 'test-upload.png');
    fs.writeFileSync(tmp, png);
    await fileInput.setInputFiles(tmp);
    await adminPage.waitForTimeout(4000);
    const toast = await adminPage.locator('text=/upload|success/i').first().count();
    results.mediaUpload = { inputFound: true, toast };
    await adminPage.screenshot({ path: path.join(OUT, '1920', 'interaction-upload-result.png') });
  } else {
    results.mediaUpload = { inputFound: false };
  }
  await adminContext.close();

  await context.close();
  return results;
}

(async () => {
  const browser = await chromium.launch();
  const slugs = await getSlugs();
  console.log('Slugs:', JSON.stringify(slugs));

  await storefrontTest(browser, slugs);
  await adminTest(browser);

  console.log('\n=== INTERACTION TESTS ===');
  const interactions = await interactionTests(browser, slugs);
  console.log(JSON.stringify(interactions, null, 2));

  await browser.close();

  // Summary
  const issues = report.filter((r) => r.overflowX > 2 || r.brokenImages > 0 || r.consoleErrors.length > 0 || r.pageError || r.failedRequests.length > 0 || r.failedHttp.length > 0);
  console.log(`\n===== SUMMARY =====`);
  console.log(`Pages checked: ${report.length}`);
  console.log(`Pages with issues: ${issues.length}`);
  for (const i of issues) {
    console.log(`- [${i.width}px] ${i.label} ovf=${i.overflowX}px imgs=${i.brokenImages} errs=${i.consoleErrors.length} reqf=${i.failedRequests.length} http=${i.failedHttp.length}`);
    for (const h of i.failedHttp) console.log(`    http: ${h}`);
    for (const e of i.consoleErrors) console.log(`    err: ${e}`);
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report, interactions }, null, 2));
  console.log(`Report: ${path.join(OUT, 'report.json')}`);
})();
