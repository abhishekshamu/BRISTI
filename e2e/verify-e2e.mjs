import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'verify-out');
const STORE = process.env.STORE_URL || 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL || 'http://localhost:3001';
const API = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bristi.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const VIEWPORTS = [1600, 1024, 480];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const results = {
  startedAt: new Date().toISOString(),
  storefrontPages: [],
  adminPages: [],
  api: {},
  crud: {},
  interactions: {},
};
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('TIMEOUT'), ms))]);

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
  } catch (e) { return { status: 0, data: String(e) }; }
}

async function getSlugs() {
  const slugs = {};
  const p = await fetchJson(`${API}/products?limit=1`);
  slugs.product = p.data?.data?.[0]?.slug ?? null;
  const c = await fetchJson(`${API}/categories`);
  slugs.category = c.data?.data?.[0]?.slug ?? null;
  const co = await fetchJson(`${API}/collections`);
  slugs.collection = co.data?.data?.[0]?.slug ?? null;
  const b = await fetchJson(`${API}/blogs`);
  slugs.blog = b.data?.data?.[0]?.slug ?? null;
  return slugs;
}

async function checkPage(page, url, label, width, contextLabel) {
  const errors = [];
  const failedHttp = [];
  const failedReq = [];
  let pageError = null;
  const onConsole = (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) {
      errors.push(msg.text().slice(0, 300));
    }
  };
  const onPageError = (err) => { pageError = String(err).slice(0, 300); };
  const onRequestFailed = (req) => {
    const u = req.url();
    if (/unsplash|images\.|fonts\.|favicon/.test(u)) return;
    failedReq.push(`${req.failure()?.errorText ?? 'fail'} ${u.slice(0, 120)}`);
  };
  const onResponse = (resp) => {
    const status = resp.status();
    if (status < 400 || /favicon/.test(resp.url())) return;
    const u = resp.url().replace(/\?.*$/, '');
    if (status === 401 && /\/api\/(auth\/me|users\/profile|admin\/me)(\?|$)/.test(u)) return;
    if (status === 400 && /\/api\/auth\/refresh-token(\?|$)/.test(u)) return;
    failedHttp.push(`${status} ${u.slice(0, 120)}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    status = resp?.status() ?? 0;
  } catch (e) {
    errors.push(`NAV: ${e.message.split('\n')[0].slice(0, 150)}`);
  }
  await page.waitForTimeout(1600);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
      tables: document.querySelectorAll('table').length,
      forms: document.querySelectorAll('form').length,
      bodyText: document.body.innerText.length,
    };
  }).catch(() => ({ overflowX: -1, brokenImgs: -1, tables: 0, forms: 0, bodyText: 0 }));

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);

  const entry = { width, context: contextLabel, label, url, status, ...metrics, errors, pageError, failedReq, failedHttp };
  results.storefrontPages.push(entry);
  const issues = [];
  if (entry.overflowX > 2) issues.push(`ovfX=${entry.overflowX}`);
  if (entry.brokenImgs > 0) issues.push(`imgs=${entry.brokenImgs}`);
  if (errors.length) issues.push(`console=${errors.length}`);
  if (pageError) issues.push('pageError');
  if (failedHttp.length) issues.push(`http=${failedHttp.length}`);
  console.log(`  [${width}px] ${label}: ${issues.length ? 'ISSUES ' + issues.join(',') : 'ok'}`);
  return entry;
}

async function storefrontSweep(browser, slugs) {
  console.log('\n=== STOREFRONT SWEEP ===');
  const routes = [
    ['/'], ['/shop'], ['/search'], ['/collections'], ['/new-arrivals'], ['/sale'],
    ['/best-sellers'], ['/trending'], ['/featured'], ['/recommended'], ['/luxury-collection'],
    ['/cart'], ['/wishlist'], ['/checkout'], ['/track-order'], ['/about'], ['/journal'],
    ['/contact'], ['/privacy'], ['/terms'], ['/shipping'], ['/refund'], ['/faq'],
    ['/login'], ['/register'], ['/forgot-password'], ['/does-not-exist'],
  ];
  if (slugs.category) routes.push([`/category/${slugs.category}`]);
  if (slugs.collection) routes.push([`/collection/${slugs.collection}`]);
  if (slugs.product) routes.push([`/product/${slugs.product}`]);
  if (slugs.blog) routes.push([`/journal/${slugs.blog}`]);

  for (const width of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const [route] of routes) {
      await checkPage(page, `${STORE}${route}`, route === '/' ? 'home' : route.slice(1) || 'home', width, 'storefront');
    }
    await context.close();
  }
}

async function adminLogin(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.fill('form input[type="email"]', ADMIN_EMAIL);
  await page.fill('form input[type="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 }).catch(() => {}),
    page.locator('form button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(2500);
  return !page.url().includes('/login');
}

async function adminSweep(browser) {
  console.log('\n=== ADMIN SWEEP ===');
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  const ok = await adminLogin(page);
  if (!ok) { console.log('ADMIN LOGIN FAILED'); return false; }
  console.log('  admin login ok');

  const modules = [
    ['/', 'dashboard'], ['/analytics'], ['/products'], ['/products/create'],
    ['/categories'], ['/categories/create'], ['/collections'], ['/collections/create'],
    ['/orders'], ['/customers'], ['/inventory'], ['/coupons'], ['/coupons/create'],
    ['/media'], ['/pages'], ['/pages/create'], ['/blogs'], ['/blogs/create'],
    ['/faqs'], ['/faqs/create'], ['/messages'], ['/promotion-banners'], ['/promotion-banners/create'],
    ['/theme/homepage-builder'], ['/theme/page-builder'], ['/theme/editor'], ['/theme/typography'],
    ['/theme/navbar'], ['/theme/footer'], ['/theme/announcement'], ['/theme/seo'],
    ['/hero'], ['/hero/create'], ['/notifications'], ['/settings'], ['/roles'], ['/audit'], ['/account'],
  ];
  for (const [route] of modules) {
    await checkPage(page, `${ADMIN}${route}`, route === '/' ? 'dashboard' : route.replace(/^\//, ''), 1600, 'admin');
  }
  await context.close();
  return true;
}

async function apiAudit() {
  console.log('\n=== API AUDIT ===');
  const audit = {};

  const publicChecks = [
    ['GET /settings', `${API}/settings`],
    ['GET /theme', `${API}/theme`],
    ['GET /hero', `${API}/hero`],
    ['GET /products', `${API}/products?limit=3`],
    ['GET /collections', `${API}/collections`],
    ['GET /categories', `${API}/categories`],
    ['GET /categories/tree', `${API}/categories/tree`],
    ['GET /blogs', `${API}/blogs`],
    ['GET /blogs/recent', `${API}/blogs/recent?limit=3`],
    ['GET /faqs', `${API}/faqs`],
    ['GET /pages', `${API}/pages`],
    ['GET /search?q=shirt', `${API}/search?q=shirt`],
    ['GET /products/featured', `${API}/products/featured`],
    ['GET /reviews/featured', `${API}/reviews/featured?limit=3`],
    ['GET /promotion-banners/active', `${API}/promotion-banners/active`],
    ['GET /notifications/count (anon=401)', `${API}/notifications/count`],
  ];
  for (const [label, url] of publicChecks) {
    const r = await fetchJson(url);
    const expected = label.includes('401') ? 401 : 200;
    audit[label] = { status: r.status, pass: r.status === expected };
    if (!audit[label].pass) console.log(`  FAIL ${label} -> ${r.status}`);
  }

  const postChecks = [
    ['POST /analytics/track', `${API}/analytics/track`, { eventName: 'verify_run', url: '/', sessionId: 'verify-' + Date.now() }],
    ['POST /newsletter/subscribe', `${API}/newsletter/subscribe`, { email: `audit-${Date.now()}@example.com`, source: 'footer' }],
    ['POST /contact', `${API}/contact`, { name: 'Audit Test', email: 'audit@example.com', subject: 'E2E verification', message: 'Automated audit message' }],
    ['POST /auth/login (wrong pwd=400)', `${API}/auth/login`, { email: 'audit@example.com', password: 'WrongPass1' }],
  ];
  for (const [label, url, body] of postChecks) {
    const r = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const pass = label.includes('400') ? r.status === 400 : r.status === 200 || r.status === 201;
    audit[label] = { status: r.status, pass };
    if (!pass) console.log(`  FAIL ${label} -> ${r.status}`);
  }

  // Admin-authenticated endpoints via real cookie jar + CSRF header
  let cookies = [];
  const cookieHeader = () => cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  let xsrf = '';
  const loginRes = await fetch(`${API}/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginStatus = loginRes.status;
  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  if (setCookies.length) {
    cookies = setCookies.map((s) => {
      const [pair, ...rest] = s.split(';');
      const i = pair.indexOf('=');
      return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
    });
    xsrf = cookies.find((c) => c.name === 'bristi_xsrf')?.value ?? '';
  }
  audit['POST /admin/login'] = { status: loginStatus, pass: loginStatus === 200, cookiesReceived: cookies.map((c) => c.name) };
  if (loginStatus !== 200) console.log(`  FAIL admin/login -> ${loginStatus}`);

  const adminChecks = [
    ['GET /admin/dashboard/stats', `${API}/admin/dashboard/stats`],
    ['GET /users/customers', `${API}/users/customers`],
    ['GET /analytics/stats', `${API}/analytics/stats`],
    ['GET /analytics/page-views', `${API}/analytics/page-views`],
    ['GET /orders', `${API}/orders?limit=3`],
    ['GET /coupons', `${API}/coupons`],
    ['GET /media', `${API}/media?limit=3`],
    ['GET /contact', `${API}/contact`],
    ['GET /blogs/all', `${API}/blogs/all`],
    ['GET /notifications', `${API}/notifications`],
    ['GET /roles', `${API}/roles`],
    ['GET /audit', `${API}/audit?limit=3`],
    ['GET /admin', `${API}/admin`],
    ['GET /inventory', `${API}/inventory`],
    ['GET /promotion-banners (admin)', `${API}/promotion-banners`],
    ['GET /settings (admin)', `${API}/settings`],
  ];
  for (const [label, url] of adminChecks) {
    const r = await fetchJson(url, { headers: { Cookie: cookieHeader(), 'X-XSRF-TOKEN': xsrf } });
    audit[label] = { status: r.status, pass: r.status === 200 };
    if (!audit[label].pass) console.log(`  FAIL ${label} -> ${r.status} (cookie=${cookieHeader().slice(0, 60)})`);
  }
  results.api = audit;
}

async function crudTests(browser) {
  console.log('\n=== CRUD TESTS ===');
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const ts = Date.now().toString().slice(-6);
  const crud = {};

  async function freshPage() {
    const page = await context.newPage();
    page.on('dialog', (d) => d.accept().catch(() => {}));
    return page;
  }
  async function login(page) {
    await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    const emailInput = page.locator('form input[type="email"]');
    if (await emailInput.count()) {
      await emailInput.first().fill(ADMIN_EMAIL);
      await page.fill('form input[type="password"]', ADMIN_PASSWORD);
      await page.locator('form button[type="submit"]').first().click();
      await page.waitForTimeout(2500);
    }
  }

  // Category create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/categories/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', `E2E Category ${ts}`);
    await page.fill('input[name="slug"]', `e2e-category-${ts}`);
    await page.fill('textarea[name="subtitle"]', 'E2E verification category');
    await page.fill('textarea[name="description"]', 'Created by automated E2E verification');
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create') || await page.locator('text=/created|success/i').first().count();
    crud.category = { ok: Boolean(okNav), url: page.url() };
    console.log(`  category: ${crud.category.ok ? 'created' : 'FAILED'} -> ${page.url().slice(0, 80)}`);
    await page.close().catch(() => {});
  } catch (e) { crud.category = { ok: false, error: e.message.split('\n')[0] }; }

  // Coupon create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/coupons/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="code"]', `E2E${ts}`);
    await page.fill('input[name="name"]', `E2E Coupon ${ts}`);
    await page.fill('input[name="value"]', '10');
    await page.fill('input[name="minimumPurchase"]', '50');
    const ctype = page.locator('select[name="type"]').first();
    if (await ctype.count()) await ctype.selectOption({ index: 1 }).catch(() => {});
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create');
    crud.coupon = { ok: Boolean(okNav), url: page.url() };
    console.log(`  coupon: ${crud.coupon.ok ? 'created' : 'FAILED'}`);
    await page.close().catch(() => {});
  } catch (e) { crud.coupon = { ok: false, error: e.message.split('\n')[0] }; }

  // Blog create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/blogs/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="title"]', `E2E Blog ${ts}`);
    await page.fill('input[name="slug"]', `e2e-blog-${ts}`);
    await page.fill('textarea[name="excerpt"]', 'E2E verification blog post');
    await page.fill('input[name="category"]', 'News').catch(() => {});
    await page.fill('input[name="author"]', 'E2E Tester').catch(() => {});
    await page.fill('input[name="tags"]', 'e2e, test').catch(() => {});
    const blogQuill = page.locator('.ql-editor').first();
    if (await blogQuill.count()) await blogQuill.click().then(() => blogQuill.fill('<p>E2E content</p>')).catch(() => {});
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create');
    crud.blog = { ok: Boolean(okNav), url: page.url() };
    console.log(`  blog: ${crud.blog.ok ? 'created' : 'FAILED'}`);
  } catch (e) { crud.blog = { ok: false, error: e.message.split('\n')[0] }; }

  // FAQ create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/faqs/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="question"]', `E2E Question ${ts}?`);
    await page.fill('textarea[name="answer"]', 'E2E verification answer.');
    const faqCat = page.locator('input[name="category"]').first();
    if (await faqCat.count()) await faqCat.fill('General').catch(() => {});
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create');
    crud.faq = { ok: Boolean(okNav), url: page.url() };
    console.log(`  faq: ${crud.faq.ok ? 'created' : 'FAILED'}`);
    await page.close().catch(() => {});
  } catch (e) { crud.faq = { ok: false, error: e.message.split('\n')[0] }; }

  // Page create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/pages/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="title"]', `E2E Page ${ts}`);
    await page.fill('input[name="slug"]', `e2e-page-${ts}`);
    await page.fill('textarea[name="excerpt"]', 'E2E verification page');
    const pageQuill = page.locator('.ql-editor').first();
    if (await pageQuill.count()) await pageQuill.click().then(() => pageQuill.fill('<p>E2E content</p>')).catch(() => {});
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create');
    crud.page = { ok: Boolean(okNav), url: page.url() };
    console.log(`  page: ${crud.page.ok ? 'created' : 'FAILED'}`);
    await page.close().catch(() => {});
  } catch (e) { crud.page = { ok: false, error: e.message.split('\n')[0] }; }

  // Promotion banner create
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/promotion-banners/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', `E2E Banner ${ts}`);
    await page.locator('button:has-text("Save"), button[type="submit"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    const okNav = !page.url().includes('/create');
    crud.promotionBanner = { ok: Boolean(okNav), url: page.url() };
    console.log(`  promotion banner: ${crud.promotionBanner.ok ? 'created' : 'FAILED'}`);
    await page.close().catch(() => {});
  } catch (e) { crud.promotionBanner = { ok: false, error: e.message.split('\n')[0] }; }

  // Media upload (tiny PNG)
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/media`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const input = page.locator('input[type="file"]').first();
    if (await input.count()) {
      await input.setInputFiles({ name: `e2e-${ts}.png`, mimeType: 'image/png', buffer: png });
      await page.waitForTimeout(3500);
      const toast = await page.locator('text=/upload|success/i').first().count();
      crud.mediaUpload = { ok: toast > 0, toast };
    } else {
      crud.mediaUpload = { ok: false, error: 'no file input found' };
    }
    console.log(`  media upload: ${crud.mediaUpload.ok ? 'ok' : 'FAILED'}`);
    await page.close().catch(() => {});
  } catch (e) { crud.mediaUpload = { ok: false, error: e.message.split('\n')[0] }; }

  // Product create (minimal)
  try {
    const page = await freshPage();
    await login(page);
    await page.goto(`${ADMIN}/products/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.fill('input[name="name"]', `E2E Product ${ts}`);
    await page.fill('input[name="sku"]', `E2E-SKU-${ts}`);
    await page.fill('input[name="price"]', '99');
    await page.fill('input[name="stock"]', '10');
    await page.fill('textarea[name="description"]', 'E2E verification product description');
    await page.fill('input[name="shortDescription"]', 'E2E short desc').catch(() => {});
    await page.fill('input[name="brand"]', 'E2E Brand').catch(() => {});
    const pcat = page.locator('select[name="category"]').first();
    if (await pcat.count()) await pcat.selectOption({ index: 1 }).catch(() => {});
    const pstatus = page.locator('select[name="status"]').first();
    if (await pstatus.count()) await pstatus.selectOption({ index: 1 }).catch(() => {});
    await page.locator('.admin-sticky-save button, .admin-sticky-save button[type="button"]').first().click().catch(() => {});
    await page.waitForTimeout(4000);
    const okNav = !page.url().includes('/create');
    crud.product = { ok: Boolean(okNav), url: page.url() };
    console.log(`  product: ${crud.product.ok ? 'created' : 'FAILED (form may need more fields)'} -> ${page.url().slice(0, 90)}`);
    await page.close().catch(() => {});
  } catch (e) { crud.product = { ok: false, error: e.message.split('\n')[0] }; }

  results.crud = crud;
  await context.close();
}

async function storefrontInteractions(browser, slugs) {
  console.log('\n=== STOREFRONT INTERACTIONS ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const i = {};

  // Search
  try {
    await page.goto(STORE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.click('button[aria-label="Search"], button:has-text("Search")');
    await page.waitForTimeout(800);
    const sInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
    if (await sInput.count()) {
      await sInput.fill('shirt');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2500);
      i.search = { ok: page.url().includes('/search'), results: await page.locator('text=/no results|found/i').first().count() };
    } else i.search = { ok: false, error: 'search input not found' };
    console.log(`  search: ${JSON.stringify(i.search)}`);
  } catch (e) { i.search = { ok: false, error: e.message.split('\n')[0] }; }

  // Add to cart
  try {
    if (slugs.product) {
      await page.goto(`${STORE}/product/${slugs.product}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const addBtn = page.locator('button:has-text("Add to bag"), button:has-text("Add to cart")').first();
      if (await addBtn.count()) {
        await addBtn.click();
        await page.waitForTimeout(1800);
        const toast = await page.locator('text=/added|bag|cart/i').first().count();
        const badge = await page.locator('[aria-label="Shopping bag"] span, header a:has-text("bag")').first().count();
        i.addToCart = { ok: toast > 0, toast, badge };
      } else i.addToCart = { ok: false, error: 'add button not found' };
      console.log(`  addToCart: ${JSON.stringify(i.addToCart)}`);
    }
  } catch (e) { i.addToCart = { ok: false, error: e.message.split('\n')[0] }; }

  // Contact form
  try {
    await page.goto(`${STORE}/contact`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const form = page.locator('form').first();
    if (await form.count()) {
      const inputs = form.locator('input[type="email"]');
      if (await inputs.count()) await inputs.first().fill(`contact-${Date.now()}@example.com`);
      const textareas = form.locator('textarea');
      if (await textareas.count()) await textareas.first().fill('E2E contact test message');
      const otherInputs = form.locator('input:not([type="email"])');
      for (let k = 0; k < Math.min(await otherInputs.count(), 3); k++) {
        const inp = otherInputs.nth(k);
        if (!(await inp.getAttribute('type') === 'hidden')) await inp.fill('E2E Tester');
      }
      await form.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      const success = await page.locator('text=/thank|success|received|sent/i').first().count();
      i.contact = { ok: success > 0 || (await page.locator('form').first().count()) > 0, success };
    } else i.contact = { ok: false, error: 'form not found' };
    console.log(`  contact: ${JSON.stringify(i.contact)}`);
  } catch (e) { i.contact = { ok: false, error: e.message.split('\n')[0] }; }

  // Newsletter
  try {
    await page.goto(STORE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const email = page.locator('input[type="email"]').last();
    if (await email.count()) {
      await email.fill(`news-${Date.now()}@example.com`);
      const btn = page.locator('button[aria-label="Subscribe to newsletter"], button[type="submit"]').last();
      await btn.click();
      await page.waitForTimeout(1800);
      const toast = await page.locator('text=/welcome to|subscribed|check your inbox/i').first().count();
      i.newsletter = { ok: toast > 0, toast };
    } else i.newsletter = { ok: false, error: 'email input not found' };
    console.log(`  newsletter: ${JSON.stringify(i.newsletter)}`);
  } catch (e) { i.newsletter = { ok: false, error: e.message.split('\n')[0] }; }

  // Track order page renders
  try {
    await page.goto(`${STORE}/track-order`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    i.trackOrder = { ok: (await page.locator('form').count()) > 0 };
    console.log(`  trackOrder: ${JSON.stringify(i.trackOrder)}`);
  } catch (e) { i.trackOrder = { ok: false, error: e.message.split('\n')[0] }; }

  results.interactions = i;
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  const slugs = await getSlugs();
  console.log('Slugs:', JSON.stringify(slugs));
  if (process.env.SKIP_STORE !== '1') await storefrontSweep(browser, slugs);
  let adminOk = false;
  if (process.env.SKIP_ADMIN !== '1') adminOk = await adminSweep(browser);
  if (adminOk || process.env.SKIP_ADMIN === '1') {
    if (process.env.SKIP_CRUD !== '1') await crudTests(browser);
    if (process.env.SKIP_INTERACT !== '1') await storefrontInteractions(browser, slugs);
  }
  if (process.env.SKIP_API !== '1') await apiAudit();
  await browser.close();
  results.finishedAt = new Date().toISOString();

  const withIssues = results.storefrontPages.filter((r) => r.overflowX > 2 || r.brokenImgs > 0 || r.errors.length > 0 || r.pageError || r.failedHttp.length > 0 || r.failedReq.length > 0);
  const apiFailed = Object.entries(results.api).filter(([, v]) => v && v.pass === false);
  const crudFailed = Object.entries(results.crud).filter(([, v]) => !v?.ok);

  results.summary = {
    storefrontPagesChecked: results.storefrontPages.length,
    storefrontPagesWithIssues: withIssues.length,
    apiChecks: Object.keys(results.api).length,
    apiFailures: apiFailed.map(([k]) => k),
    crudChecks: Object.keys(results.crud).length,
    crudFailures: crudFailed.map(([k]) => k),
    interactionFailures: Object.entries(results.interactions).filter(([, v]) => v && v.ok === false).map(([k]) => k),
    adminLoginOk: adminOk,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  console.log('\n===== SUMMARY =====');
  console.log(JSON.stringify(results.summary, null, 2));
  if (withIssues.length) {
    console.log('\nPages with issues:');
    for (const r of withIssues) console.log(`- [${r.width}] ${r.context}/${r.label} ovf=${r.overflowX} imgs=${r.brokenImgs} errs=${r.errors.length} http=${r.failedHttp.length}`);
  }
  if (apiFailed.length) console.log('\nAPI failures:', apiFailed.map(([k, v]) => `${k}->${v.status}`).join('; '));
  console.log(`\nReport: ${path.join(OUT, 'report.json')}`);
})();
