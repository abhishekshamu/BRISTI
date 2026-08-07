import { chromium } from 'playwright';

const ADMIN = process.env.ADMIN_URL || 'http://127.0.0.1:3001';
const ADMIN_EMAIL = 'admin@bristi.com';
const ADMIN_PASSWORD = 'Admin@123';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
page.on('response', (r) => {
  if (r.status() >= 400) {
    r.text().then((t) => console.log(`API ${r.status()} ${r.request().method()} ${r.url().replace(ADMIN, '')}: ${t.slice(0, 300)}`)).catch(() => {});
  }
  if (r.request().method() === 'POST' && r.url().includes('/api/')) {
    console.log(`POST ${r.status()} ${r.url().replace(ADMIN, '')}`);
  }
});

await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.fill('form input[type="email"]', ADMIN_EMAIL);
await page.fill('form input[type="password"]', ADMIN_PASSWORD);
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(3000);
console.log('logged in:', !page.url().includes('/login'));

const ts = Date.now().toString().slice(-6);

async function tryPage(path, fillFn) {
  await page.goto(`${ADMIN}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log(`\n### ${path} — URL: ${page.url()}`);
  const fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, textarea, select'))
      .map((e) => `${e.tagName.toLowerCase()} name="${e.getAttribute('name') || ''}" type="${e.getAttribute('type') || ''}"`)
  );
  console.log('fields:', fields.join(' | '));
  await fillFn(page);
  const save = page.locator('button:has-text("Save"), button[type="submit"]').first();
  console.log('save button text:', (await save.textContent().catch(() => 'n/a'))?.trim().slice(0, 60));
  await save.click().catch((e) => console.log('click err:', e.message.split('\n')[0]));
  await page.waitForTimeout(3500);
  console.log('after save URL:', page.url());
  const errs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="error"], .text-red-500, [role="alert"], [class*="text-red-600"]'))
      .map((e) => (e.textContent || '').trim().slice(0, 120))
      .filter(Boolean)
  );
  console.log('visible errors:', JSON.stringify(errs.slice(0, 6)));
  const errTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('p, span, small'))
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /required|must be|invalid/i.test(t))
  );
  console.log('inline validation msgs:', JSON.stringify(errTexts.slice(0, 8)));
  const toasts = await page.locator('[class*="toast"], [role="status"]').count();
  console.log('toasts:', toasts);
  const toastTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="toast"], [role="status"]'))
      .map((e) => (e.textContent || '').trim().slice(0, 200))
      .filter(Boolean)
  );
  console.log('toast texts:', JSON.stringify(toastTexts.slice(0, 4)));
}

await tryPage('/blogs/create', async (p) => {
  await p.fill('input[name="title"]', `E2E Blog ${ts}`);
  await p.fill('input[name="slug"]', `e2e-blog-${ts}`);
  await p.fill('textarea[name="excerpt"]', 'E2E verification blog post');
  await p.fill('input[name="category"]', 'News');
  await p.fill('input[name="author"]', 'E2E Tester');
  const quill = p.locator('.ql-editor').first();
  if (await quill.count()) {
    await quill.click();
    await quill.fill('<p>E2E content</p>');
    console.log('quill filled, html:', (await quill.innerHTML().catch(() => 'n/a')).slice(0, 80));
  } else console.log('NO QUILL EDITOR');
});

await tryPage('/faqs/create', async (p) => {
  await p.fill('input[name="question"]', `E2E Question ${ts}?`);
  await p.fill('textarea[name="answer"]', 'E2E verification answer.');
  await p.fill('input[name="category"]', 'General');
  await p.fill('input[name="sortOrder"]', '1');
});

await tryPage('/products/create', async (p) => {
  await p.fill('input[name="name"]', `E2E Product ${ts}`);
  await p.fill('input[name="sku"]', `E2E-SKU-${ts}`);
  await p.fill('input[name="price"]', '99');
  await p.fill('input[name="stock"]', '10');
  await p.fill('input[name="brand"]', 'E2E Brand');
  await p.fill('textarea[name="description"]', 'E2E verification product description');
  await p.fill('input[name="shortDescription"]', 'E2E short');
  await p.fill('input[name="barcode"]', `E2EBAR${ts}`);
  const cat = p.locator('select[name="category"]').first();
  if (await cat.count()) {
    const opts = await cat.locator('option').count();
    console.log('product category options:', opts);
    if (opts > 1) await cat.selectOption({ index: 1 });
  }
  const status = p.locator('select[name="status"]').first();
  if (await status.count()) {
    const labels = await status.locator('option').evaluateAll((os) => os.map((o) => o.textContent?.trim()));
    console.log('status options:', JSON.stringify(labels));
    await status.selectOption({ index: 1 }).catch(() => {});
  }
});

await browser.close();
