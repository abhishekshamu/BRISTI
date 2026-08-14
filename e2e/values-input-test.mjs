import { chromium } from 'playwright';

const ADMIN = 'http://127.0.0.1:3003';
const API = 'http://127.0.0.1:3003/api';
const NAME_IN = 'input[placeholder="Option name (e.g. Size)"]';
const VALUES_IN = 'input[placeholder="Type a value, press Enter or comma"]';

let passed = 0, failed = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { passed++; console.log(`PASS - ${label}${extra ? ' :: ' + extra : ''}`); }
  else { failed++; console.log(`FAIL - ${label}${extra ? ' :: ' + extra : ''}`); }
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));

const csrfToken = () => context.cookies().then(cs => cs.find(c => c.name === 'bristi_xsrf')?.value ?? '');
const apiCall = async (method, path, body) => {
  const res = await context.request.fetch(`${API}${path}`, {
    method, data: body, headers: { 'X-XSRF-TOKEN': await csrfToken() },
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status(), json };
};

await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.locator('input[type="email"]').first().fill('admin@bristi.com');
await page.locator('input[type="password"]').first().fill('Admin@123');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(4500);
ok('login', page.url().startsWith(`${ADMIN}/`), page.url());

const ts = Date.now();
const cats = await apiCall('GET', '/categories');
const created = await apiCall('POST', '/products', {
  name: `E2E Values Input Test ${ts}`,
  description: 'Temporary product for option-value input testing — will be deleted.',
  price: 99,
  category: cats.json.data[0]._id,
  sku: `E2E-VAL-${ts}`,
  stock: 0,
});
ok('scratch product created', created.status === 201, `status=${created.status}`);
const productId = created.json.data._id;
const editUrl = `${ADMIN}/products/${productId}/edit`;

await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await page.locator('button:has-text("Option")').first().waitFor({ timeout: 30000 });

const addOption = async () => { await page.locator('button:has-text("Option")').first().click(); await page.waitForTimeout(300); };
const chips = async (i) => {
  const card = page.locator(NAME_IN).nth(i).locator('xpath=ancestor::div[contains(@class,"border")][1]');
  return await card.locator('button[aria-label^="Remove "]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-label').replace(/^Remove /, ''))
  );
};
const draft = async (i) => await page.locator(VALUES_IN).nth(i).inputValue();
const removeAllChips = async (i) => {
  const card = page.locator(NAME_IN).nth(i).locator('xpath=ancestor::div[contains(@class,"border")][1]');
  const btns = card.locator('button[aria-label^="Remove "]');
  while ((await btns.count()) > 0) await btns.first().click();
};
const clearDraft = async (i) => { await page.locator(VALUES_IN).nth(i).fill(''); };
const save = async () => {
  await page.locator('button:has-text("Save changes")').first().click();
  await page.waitForTimeout(6000);
  return await page.evaluate(() => Array.from(document.querySelectorAll('[role="status"]')).map(e => e.textContent));
};
const getProduct = async () => (await apiCall('GET', `/products/${productId}`)).json.data;

await addOption();
await page.locator(NAME_IN).nth(0).fill('Size');

// ===== Case 1: type S,M,L,XL -> chips S M L XL =====
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('S,M,L,XL');
ok('C1 comma commits S and continues', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L']), JSON.stringify(await chips(0)));
ok('C1 final draft is XL (committed on Enter)', (await draft(0)) === 'XL', await draft(0));
await page.keyboard.press('Enter');
ok('C1 chips after Enter', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L', 'XL']), JSON.stringify(await chips(0)));
ok('C1 draft cleared after commit', (await draft(0)) === '', await draft(0));

// ===== Case 2: type "S, M, L, XL" (spaces) -> same result =====
await removeAllChips(0);
await clearDraft(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('S, M, L, XL');
await page.keyboard.press('Enter');
ok('C2 spaced input trimmed', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L', 'XL']), JSON.stringify(await chips(0)));

// ===== Case 5: type S,,M,,L -> S M L =====
await removeAllChips(0);
await clearDraft(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('S,,M,,L');
await page.keyboard.press('Enter');
ok('C5 empty segments ignored', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L']), JSON.stringify(await chips(0)));

// ===== Case 6: type S,M,S,L -> S M L (dedupe) =====
await removeAllChips(0);
await clearDraft(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('S,M,S,L');
await page.keyboard.press('Enter');
ok('C6 duplicates rejected', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L']), JSON.stringify(await chips(0)));

// ===== Case 4: Enter after S commits =====
await removeAllChips(0);
await clearDraft(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('S');
ok('C4 draft shows S before Enter', (await draft(0)) === 'S', await draft(0));
await page.keyboard.press('Enter');
ok('C4 Enter commits S', JSON.stringify(await chips(0)) === JSON.stringify(['S']), JSON.stringify(await chips(0)));

// ===== Case 3: paste Black,White,Charcoal =====
await removeAllChips(0);
await clearDraft(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.locator(VALUES_IN).nth(0).evaluate((el) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', 'Black,White,Charcoal');
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
await page.waitForTimeout(500);
ok('C3 paste split on commas', JSON.stringify(await chips(0)) === JSON.stringify(['Black', 'White', 'Charcoal']), JSON.stringify(await chips(0)));
ok('C3 draft cleared after paste', (await draft(0)) === '', await draft(0));

// ===== paste with newlines =====
await removeAllChips(0);
await page.locator(VALUES_IN).nth(0).focus();
await page.locator(VALUES_IN).nth(0).evaluate((el) => {
  const dt = new DataTransfer();
  dt.setData('text/plain', 'S\nM\nL\nXL');
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
await page.waitForTimeout(500);
ok('C-newline paste split on newlines', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L', 'XL']), JSON.stringify(await chips(0)));

// ===== Backspace on empty draft removes last chip =====
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.press('Backspace');
await page.keyboard.press('Backspace');
ok('C-bs backspace removes last chips', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M']), JSON.stringify(await chips(0)));

// ===== Case 7: save + reload -> values remain separate =====
await page.locator(VALUES_IN).nth(0).focus();
await page.keyboard.type('L');
await page.keyboard.press('Enter');
const toasts = await save();
ok('C7 save toast', toasts.some(t => t.includes('Product updated successfully')), JSON.stringify(toasts));
const p = await getProduct();
ok('C7 saved as separate values', JSON.stringify(p.options[0].values) === JSON.stringify(['S', 'M', 'L']), JSON.stringify(p.options[0].values));
ok('C7 values are not a single string', p.options[0].values.length === 3 && !p.options[0].values.some(v => v.includes(',') || v.includes('\n')));
await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await page.locator(NAME_IN).first().waitFor({ timeout: 30000 });
ok('C7 reload keeps separate chips', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L']), JSON.stringify(await chips(0)));

// ===== load-time normalization of malformed single list value =====
const malformed = await apiCall('POST', '/products', {
  name: `E2E Malformed Values ${ts}`,
  description: 'Temporary — deleted after check.',
  price: 99,
  category: cats.json.data[0]._id,
  sku: `E2E-MAL-${ts}`,
  stock: 0,
  options: [{ name: 'Size', values: ['S,M,L,XL'] }, { name: 'Color', values: ['Black\nWhite'] }],
  variants: [],
});
const malformedId = malformed.json.data._id;
await page.goto(`${ADMIN}/products/${malformedId}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.locator(NAME_IN).first().waitFor({ timeout: 30000 });
ok('C8 malformed "S,M,L,XL" split on load', JSON.stringify(await chips(0)) === JSON.stringify(['S', 'M', 'L', 'XL']), JSON.stringify(await chips(0)));
ok('C8 malformed newline list split on load', JSON.stringify(await chips(1)) === JSON.stringify(['Black', 'White']), JSON.stringify(await chips(1)));
await apiCall('DELETE', `/products/${malformedId}`);

// ===== cleanup =====
const del = await apiCall('DELETE', `/products/${productId}`);
ok('cleanup scratch product deleted', del.status === 200, `status=${del.status}`);

console.log('\n=== PAGE ERRORS ===');
pageErrors.slice(0, 10).forEach(e => console.log('-', e));
console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);