import { chromium } from 'playwright';

const ADMIN = 'http://127.0.0.1:3003';
const API = 'http://127.0.0.1:3003/api'; // via vite proxy -> localhost:5000
const NAME_IN = 'input[placeholder="Option name (e.g. Size)"]';
const VALUES_IN = 'input[placeholder="Values, comma separated (e.g. S, M, L)"]';
const SKU_IN = 'input[placeholder="Variant SKU"]';
const STOCK_IN = 'input[placeholder="Stock"]';
const PRICE_IN = 'input[placeholder="Price adj."]';
const VNAME_IN = 'input[placeholder="Variant name (e.g. S / Black)"]';

let passed = 0, failed = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { passed++; console.log(`PASS - ${label}${extra ? ' :: ' + extra : ''}`); }
  else { failed++; console.log(`FAIL - ${label}${extra ? ' :: ' + extra : ''}`); }
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const pageErrors = [];
const apiFailures = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));
page.on('response', (r) => {
  if (r.url().includes('/api/') && r.status() >= 400 && !r.url().includes('/admin/me')) {
    apiFailures.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  }
});

const csrfToken = () => context.cookies().then(cs => cs.find(c => c.name === 'bristi_xsrf')?.value ?? '');

const apiCall = async (method, path, body) => {
  const res = await context.request.fetch(`${API}${path}`, {
    method,
    data: body,
    headers: { 'X-XSRF-TOKEN': await csrfToken() },
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status(), json };
};

// ---------- login ----------
await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await page.locator('input[type="email"]').first().fill('admin@bristi.com');
await page.locator('input[type="password"]').first().fill('Admin@123');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(4500);
ok('login', page.url().startsWith(`${ADMIN}/`), page.url());

// ---------- create scratch product ----------
const ts = Date.now();
const cats = await apiCall('GET', '/categories');
const catId = cats.json?.data?.[0]?._id;
const created = await apiCall('POST', '/products', {
  name: `E2E Variant Test ${ts}`,
  description: 'Temporary product for variant testing — will be deleted.',
  price: 99,
  category: catId,
  sku: `E2E-VAR-${ts}`,
  stock: 0,
});
ok('scratch product created', created.status === 200 || created.status === 201, `status=${created.status}`);
const productId = created.json?.data?._id;
const editUrl = `${ADMIN}/products/${productId}/edit`;

const openEdit = async () => {
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.locator('button:has-text("Option")').first().waitFor({ timeout: 30000 });
};

const optionCards = () => page.locator('div.border.border-slate-200.rounded-lg');
const variantCards = () =>
  page.locator('div.border.border-slate-200.rounded-lg').filter({ has: page.locator(SKU_IN) });

const setOptionName = async (i, name) => {
  await page.locator(NAME_IN).nth(i).fill(name);
};
const setOptionValues = async (i, csv) => {
  await page.locator(VALUES_IN).nth(i).fill(csv);
};
const addOption = async () => {
  await page.locator('button:has-text("Option")').first().click();
  await page.waitForTimeout(300);
};
const save = async () => {
  await page.locator('button:has-text("Save changes")').first().click();
  await page.waitForTimeout(6000);
  return await page.evaluate(() => Array.from(document.querySelectorAll('[role="status"]')).map(e => e.textContent));
};
const getProduct = async () => (await apiCall('GET', `/products/${productId}`)).json.data;
const comboOf = (v) => Object.entries(v.options ?? {}).map(([k, val]) => `${k}=${val}`).sort().join('|');

// ================= TEST 1: Color[Black] x Size[S] -> 1 variant =================
await openEdit();
await addOption();
await setOptionName(0, 'Color');
await setOptionValues(0, 'Black');
await addOption();
await setOptionName(1, 'Size');
await setOptionValues(1, 'S');
const toasts1 = await save();
ok('T1 save toast', toasts1.some(t => t.includes('Product updated successfully')), JSON.stringify(toasts1));
let p = await getProduct();
ok('T1 options', p.options.length === 2 && p.options[0].name === 'Color' && p.options[0].values.join() === 'Black' && p.options[1].name === 'Size' && p.options[1].values.join() === 'S');
ok('T1 exactly 1 variant', p.variants.length === 1, `count=${p.variants.length}`);
ok('T1 combo', p.variants[0] && comboOf(p.variants[0]) === 'Color=Black|Size=S', comboOf(p.variants[0]));
ok('T1 auto name', p.variants[0]?.name === 'Black / S', p.variants[0]?.name);

// ================= TEST 2: Black,White x S,M -> 4 variants =================
await page.locator(VALUES_IN).nth(0).fill('Black, White');
await page.locator(VALUES_IN).nth(1).fill('S, M');
const toasts2 = await save();
ok('T2 save toast', toasts2.some(t => t.includes('Product updated successfully')));
p = await getProduct();
ok('T2 4 variants', p.variants.length === 4, `count=${p.variants.length}`);
const combos2 = p.variants.map(comboOf).sort().join(';');
ok('T2 combos', combos2 === 'Color=Black|Size=M;Color=Black|Size=S;Color=White|Size=M;Color=White|Size=S', combos2);

// ================= TEST 3: 3x4 -> 12 variants =================
await page.locator(VALUES_IN).nth(0).fill('Black, White, Charcoal');
await page.locator(VALUES_IN).nth(1).fill('S, M, L, XL');
const toasts3 = await save();
ok('T3 save toast', toasts3.some(t => t.includes('Product updated successfully')));
p = await getProduct();
ok('T3 12 unique variants', p.variants.length === 12, `count=${p.variants.length}`);
const combos3 = new Set(p.variants.map(comboOf));
ok('T3 all 12 combos unique', combos3.size === 12);
const expected = [];
for (const c of ['Black', 'White', 'Charcoal']) for (const s of ['S', 'M', 'L', 'XL']) expected.push(`Color=${c}|Size=${s}`);
ok('T3 grid correct', expected.every(e => combos3.has(e)));

// ================= TEST 4: preserve existing variants (sku/stock/id) when adding values =================
// Set Black/S sku + stock via the UI, then add a value and verify preservation.
await openEdit();
await variantCards().nth(0).locator(SKU_IN).fill('T-BLK-S');
await variantCards().nth(0).locator(STOCK_IN).fill('10');
const toasts4 = await save();
ok('T4 save toast', toasts4.some(t => t.includes('Product updated successfully')));
p = await getProduct();
const blackS = p.variants.find(v => comboOf(v) === 'Color=Black|Size=S');
ok('T4 Black/S sku/stock saved', blackS && blackS.sku === 'T-BLK-S' && blackS.stock === 10, `sku=${blackS?.sku} stock=${blackS?.stock}`);
const blackId = blackS?.id;
await openEdit();
await page.locator(VALUES_IN).nth(0).fill('Black, White, Charcoal, Green');
const toasts4b = await save();
ok('T4 add-value save toast', toasts4b.some(t => t.includes('Product updated successfully')));
p = await getProduct();
const blackS3 = p.variants.find(v => comboOf(v) === 'Color=Black|Size=S');
ok('T4 Black/S preserved after add', blackS3 && blackS3.sku === 'T-BLK-S' && blackS3.stock === 10, `sku=${blackS3?.sku} stock=${blackS3?.stock}`);
ok('T4 Black/S id preserved', blackS3 && blackS3.id === blackId, `id=${blackS3?.id} vs ${blackId}`);
ok('T4 Green combos created', ['S', 'M', 'L', 'XL'].every(s => p.variants.some(v => v.options?.Color === 'Green' && v.options?.Size === s)));
ok('T4 16 unique variants', p.variants.length === 16 && new Set(p.variants.map(comboOf)).size === 16, `count=${p.variants.length}`);

// ================= TEST 5: remove XL -> only XL variants removed =================
await openEdit();
await page.locator(VALUES_IN).nth(1).fill('S, M, L');
const toasts5 = await save();
ok('T5 save toast', toasts5.some(t => t.includes('Product updated successfully')));
p = await getProduct();
ok('T5 12 variants remain', p.variants.length === 12, `count=${p.variants.length}`);
ok('T5 no XL combos', !p.variants.some(v => (v.options?.Size ?? '') === 'XL'));
const blackS5 = p.variants.find(v => comboOf(v) === 'Color=Black|Size=S');
ok('T5 Black/S still preserved', blackS5 && blackS5.sku === 'T-BLK-S' && blackS5.stock === 10, `sku=${blackS5?.sku} stock=${blackS5?.stock}`);
ok('T5 non-XL sizes intact', ['S', 'M', 'L'].every(s => p.variants.some(v => v.options?.Size === s)));

// ================= TEST 6: rename Black -> Navy Blue =================
await openEdit();
await page.locator(VALUES_IN).nth(0).fill('Navy Blue, White, Charcoal, Green');
const toasts6 = await save();
ok('T6 save toast', toasts6.some(t => t.includes('Product updated successfully')));
p = await getProduct();
ok('T6 no Black combos', !p.variants.some(v => (v.options?.Color ?? '') === 'Black'));
ok('T6 Navy Blue combos present', ['S', 'M', 'L'].every(s => p.variants.some(v => v.options?.Color === 'Navy Blue' && v.options?.Size === s)));
const navyS = p.variants.find(v => v.options?.Color === 'Navy Blue' && v.options?.Size === 'S');
ok('T6 rename preserved data', navyS && navyS.sku === 'T-BLK-S' && navyS.stock === 10, `sku=${navyS?.sku} stock=${navyS?.stock}`);
ok('T6 still 12 unique variants', new Set(p.variants.map(comboOf)).size === p.variants.length, `count=${p.variants.length}`);

// ================= TEST 7: reload shows exact structure =================
await openEdit();
ok('T7 options after reload', await page.locator(VALUES_IN).nth(0).inputValue() === 'Navy Blue, White, Charcoal, Green' && await page.locator(VALUES_IN).nth(1).inputValue() === 'S, M, L');
const cardCount = await variantCards().count();
ok('T7 12 variant cards after reload', cardCount === 12, `cards=${cardCount}`);
const selects = await variantCards().nth(0).locator('select').all();
ok('T7 per-variant option pickers', selects.length === 2, `pickers=${selects.length}`);

// ================= TEST 8: save again + refresh =================
const toasts8 = await save();
ok('T8 save toast', toasts8.some(t => t.includes('Product updated successfully')));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
const cardCount2 = await variantCards().count();
const firstCardOptionsText = await variantCards().nth(0).locator('div.text-xs.text-slate-500').first().textContent().catch(() => '');
ok('T8 identical after refresh', cardCount2 === 12, `cards=${cardCount2}`);
ok('T8 combo text rendered', /Color:/.test(firstCardOptionsText) && /Size:/.test(firstCardOptionsText), firstCardOptionsText.trim());

// ================= duplicate combination guard in UI =================
await openEdit();
const c1 = await variantCards().nth(0).locator('select').all();
const c2 = await variantCards().nth(1).locator('select').all();
const v1vals = await Promise.all(c1.map(s => s.inputValue()));
const v2vals = await Promise.all(c2.map(s => s.inputValue()));
// set card2's selects to card1's values -> conflict toast expected, state unchanged
for (let i = 0; i < v1vals.length; i++) await c2[i].selectOption(v1vals[i]);
await page.waitForTimeout(500);
const conflictToast = await page.evaluate(() => Array.from(document.querySelectorAll('[role="status"]')).map(e => e.textContent).some(t => t.includes('already exists')));
ok('T9 duplicate combo rejected', conflictToast);
const v2valsAfter = await Promise.all((await variantCards().nth(1).locator('select').all()).map(s => s.inputValue()));
ok('T9 state unchanged after rejection', v2valsAfter.join() === v2vals.join(), v2valsAfter.join());

// ================= load of existing malformed product (no crash, normalized) =================
await page.goto(`${ADMIN}/products/6a7f6ab2819b19560fffd100/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
ok('M1 malformed product loads', (await page.locator(NAME_IN).count()) === 1 && (await page.locator('input[name="title"]').count()) >= 0, 'options cards=' + (await page.locator(NAME_IN).count()));
const mValues = await page.locator(VALUES_IN).first().inputValue();
ok('M2 option normalized to SIZE [S]', mValues === 'S', mValues);
const mCards = await variantCards();
const mTexts = [];
for (let i = 0; i < await mCards.count(); i++) mTexts.push((await mCards.nth(i).locator('div.text-xs.text-slate-500').first().textContent().catch(() => '')) ?? '');
ok('M3 no "SIZE : XL" orphan display', !mTexts.some(t => t.includes('SIZE : XL')), mTexts.join(' | '));
ok('M4 all variant cards render pickers', (await mCards.nth(1).locator('select').count()) === 1, `pickers=${await mCards.nth(1).locator('select').count()}`);
const whiteSelectVal = await mCards.nth(1).locator('select').first().inputValue().catch(() => '');
ok('M5 WHITE size select = S', whiteSelectVal === 'S', whiteSelectVal);

// ================= backend validation rejects malformed payloads =================
const base = p; // product with 9 variants (use as valid base)
const validVariants = base.variants.map(v => ({ ...v, options: v.options }));
const validOptions = base.options;
const putWith = async (body) => (await apiCall('PUT', `/products/${productId}`, body)).status;
ok('V1 valid payload accepted', (await putWith({ options: validOptions, variants: validVariants })) === 200);
ok('V2 duplicate option names rejected', (await putWith({
  options: [{ name: 'Color', values: ['Black'] }, { name: ' Color ', values: ['White'] }],
  variants: [],
})) === 400);
ok('V3 orphan variant option key rejected', (await putWith({
  options: validOptions,
  variants: [{ ...validVariants[0], options: { ...validVariants[0].options, 'SIZE ': 'S' } }],
})) === 400);
ok('V4 value not in option rejected', (await putWith({
  options: validOptions,
  variants: [{ ...validVariants[0], options: { ...validVariants[0].options, Color: 'Purple' } }],
})) === 400);
ok('V5 duplicate combination rejected (order swapped)', (await putWith({
  options: validOptions,
  variants: [
    { ...validVariants[0], id: 'x1', name: 'a' },
    { ...validVariants[1], id: 'x2', name: 'b', options: { Size: 'S', Color: 'Navy Blue' } },
  ],
})) === 400);
ok('V6 variant duplicate key (case) rejected', (await putWith({
  options: validOptions,
  variants: [{ ...validVariants[0], options: { Color: 'Navy Blue', color: 'White' } }],
})) === 400);

// ================= cleanup =================
const del = await apiCall('DELETE', `/products/${productId}`);
ok('cleanup scratch product deleted', del.status === 200, `status=${del.status}`);

console.log('\n=== PAGE ERRORS ===');
pageErrors.slice(0, 10).forEach(e => console.log('-', e));
console.log('=== API FAILURES ===');
apiFailures.slice(0, 10).forEach(e => console.log('-', e));
console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);