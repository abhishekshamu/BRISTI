import { chromium } from 'playwright';

const ADMIN = 'http://127.0.0.1:3001';
const API = 'http://127.0.0.1:5000';
const EMAIL = 'admin@bristi.com';
const PASSWORD = 'Admin@123';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.fill('form input[type="email"]', EMAIL);
await page.fill('form input[type="password"]', PASSWORD);
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(3000);

const cookies = await context.cookies();
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
const accessCookie = cookies.find(c => c.name === 'bristi_access_token');
const xsrfToken = accessCookie ? accessCookie.value : '';

const headers = {
  'Cookie': cookieHeader,
  'X-XSRF-TOKEN': xsrfToken,
  'Content-Type': 'application/json',
};

async function deleteAll(path, filterFn) {
  const res = await fetch(`${API}${path}`, { headers });
  const data = await res.json();
  const items = (data.data || []).filter(filterFn);
  console.log(`Deleting ${items.length} items from ${path}`);
  for (const item of items) {
    await fetch(`${API}${path}/${item._id}`, { method: 'DELETE', headers });
  }
}

await deleteAll('/products', p => p.sku && p.sku.startsWith('E2E-SKU'));
await deleteAll('/categories', c => c.slug && c.slug.startsWith('e2e-category'));
await deleteAll('/blogs', b => b.slug && b.slug.startsWith('e2e-blog'));
await deleteAll('/faqs', f => f.question && f.question.startsWith('E2E Question'));
await deleteAll('/pages', p => p.slug && p.slug.startsWith('e2e-page'));
await deleteAll('/coupons', c => c.code && c.code.startsWith('E2E'));
await deleteAll('/promotion-banners', b => b.name && b.name.startsWith('E2E Banner'));

console.log('E2E cleanup done');
await browser.close();
