import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'sticky-shots');
const STORE = process.env.STORE_URL || 'http://localhost:3000';
const BASE = `${STORE}/product/heritage-leather-belt`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const consoleErrors = [];
const failedHttp = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); } catch {}
}

function watch(page) {
  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (/Failed to load resource/.test(t)) return;
      consoleErrors.push(t.slice(0, 300));
    }
  };
  const onResponse = (resp) => {
    const status = resp.status();
    if (status < 400 || /favicon/.test(resp.url())) return;
    const url = resp.url().replace(/\?.*$/, '');
    if (status === 401 && /\/api\/(auth\/me|users\/profile|admin\/me)(\?|$)/.test(url)) return;
    if (status === 400 && /\/api\/auth\/refresh-token(\?|$)/.test(url)) return;
    failedHttp.push(`${status} ${url}`);
  };
  page.on('console', onConsole);
  page.on('response', onResponse);
  return () => { page.off('console', onConsole); page.off('response', onResponse); };
}

const visible = (els) => els.filter((e) => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
});

async function pageState(page) {
  return page.evaluate((fn) => fn(visible), `(${visible.toString()})`);
}

async function state(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const pills = [...document.querySelectorAll('span[aria-live="polite"]')].filter(visible);
    const thumbs = [...document.querySelectorAll('button[aria-label^="View image "][aria-label$="of 4"]')].filter(visible);
    const slides = [...document.querySelectorAll('[data-index]')].filter(visible);
    const scrollers = [...document.querySelectorAll('[class*="snap-y"], [class*="snap-x"]')].filter(visible);
    const dialog = document.querySelector('[role="dialog"]');
    const sticky = document.querySelector('.lg\\:sticky');
    return {
      counter: pills.length ? pills[pills.length - 1].textContent.trim() : null,
      activeThumb: thumbs.find((b) => b.getAttribute('aria-current') === 'true')?.getAttribute('aria-label') ?? null,
      thumbCount: thumbs.length,
      slideCount: slides.length,
      scrollerScrollTop: scrollers.find((s) => s.className.includes('snap-y'))?.scrollTop ?? null,
      scrollerScrollLeft: scrollers.find((s) => s.className.includes('snap-x'))?.scrollLeft ?? null,
      scrollY: window.scrollY,
      stickyTop: sticky ? sticky.getBoundingClientRect().top : null,
      fullscreen: Boolean(dialog),
      fsCounter: dialog ? (dialog.querySelector('span[aria-live="polite"]')?.textContent.trim() ?? null) : null,
      fsCursor: dialog ? getComputedStyle(dialog).cursor : null,
      scrollLocked: document.body.style.overflow === 'hidden',
      lazyFlags: slides.slice(0, 4).map((s) => s.querySelector('img')?.getAttribute('loading') ?? null),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      zoomBtn: [...document.querySelectorAll('button[aria-label="View image in fullscreen"]')].filter(visible).length > 0,
    };
  });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 700 } });
const page = await context.newPage();
const unwatch = watch(page);

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1800);
const initialScrollY = (await state(page)).scrollY;

// ---- Desktop: initial render
let s = await state(page);
record('desktop: page did not auto-scroll on load', initialScrollY === 0, `scrollY=${initialScrollY}`);
record('desktop: sticky gallery present', s.stickyTop !== null && s.stickyTop > 0, `top=${s.stickyTop}`);
record('desktop: 4 slides stacked', s.slideCount === 4, `got ${s.slideCount}`);
record('desktop: 4 rail thumbnails', s.thumbCount === 4, `got ${s.thumbCount}`);
record('desktop: first thumbnail active', s.activeThumb === 'View image 1 of 4', `got ${s.activeThumb}`);
record('desktop: counter 1 / 4', s.counter === '1 / 4', `got ${s.counter}`);
record('desktop: zoom button present', s.zoomBtn);
record('desktop: first slide eager, rest lazy', JSON.stringify(s.lazyFlags) === JSON.stringify(['eager', 'lazy', 'lazy', 'lazy']), `got ${JSON.stringify(s.lazyFlags)}`);
record('desktop: no horizontal overflow', s.overflowX === 0, `got ${s.overflowX}`);
await shot(page, '01-desktop-initial');

// ---- Sticky: wheel over INFO column scrolls page, gallery pinned
const stickyTopBefore = s.stickyTop;
const scrollerTopBefore = s.scrollerScrollTop;
await page.mouse.move(1000, 350); // right column
await page.mouse.wheel(0, 200);
await page.waitForTimeout(400);
s = await state(page);
record('desktop: wheeling info scrolls page', s.scrollY > 0, `scrollY=${s.scrollY}`);
record('desktop: gallery stays pinned (sticky)', Math.abs(s.stickyTop - 144) < 2, `top ${stickyTopBefore} -> ${s.stickyTop}`);
record('desktop: gallery scroller did not move', s.scrollerScrollTop === scrollerTopBefore, `top=${s.scrollerScrollTop}`);
record('desktop: active unchanged (1 / 4)', s.counter === '1 / 4', `got ${s.counter}`);
await shot(page, '02-sticky-while-info-scrolls');

// ---- Wheel over gallery scrolls the scroller (native, no interception)
const scrollYBefore = s.scrollY;
await page.mouse.move(300, 350); // over gallery column
await page.mouse.wheel(0, 320);
await page.waitForTimeout(500);
s = await state(page);
record('desktop: wheel over gallery scrolls scroller', (s.scrollerScrollTop ?? 0) > 0, `top=${s.scrollerScrollTop}`);
record('desktop: page scrollY unchanged while wheeling gallery', s.scrollY === scrollYBefore, `${scrollYBefore} -> ${s.scrollY}`);
record('desktop: active image 2 highlighted', s.activeThumb === 'View image 2 of 4', `got ${s.activeThumb}`);
record('desktop: counter 2 / 4', s.counter === '2 / 4', `got ${s.counter}`);
await shot(page, '03-gallery-scroll-active-2');

// ---- Wheel to the last slide
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
}
s = await state(page);
record('desktop: reaches last image (4 / 4)', s.counter === '4 / 4', `got ${s.counter}`);
record('desktop: last thumbnail active', s.activeThumb === 'View image 4 of 4', `got ${s.activeThumb}`);
const scrollTopAtEnd = s.scrollerScrollTop;
await shot(page, '04-last-image');

// ---- Scroll chaining: wheel at gallery end scrolls the page
const scrollYAtEnd = s.scrollY;
await page.mouse.wheel(0, 500);
await page.waitForTimeout(400);
s = await state(page);
record('desktop: wheel at gallery end chains to page scroll', s.scrollY > scrollYAtEnd, `${scrollYAtEnd} -> ${s.scrollY}`);

// ---- Thumbnail click: smooth scroll to that image
await page.locator('button[aria-label="View image 3 of 4"]:visible').first().click();
await page.waitForTimeout(900);
s = await state(page);
record('desktop: rail click scrolls to 3 / 4', s.counter === '3 / 4', `got ${s.counter}`);
record('desktop: rail click highlights thumbnail 3', s.activeThumb === 'View image 3 of 4', `got ${s.activeThumb}`);
record('desktop: scroller scrolled for thumb click', (s.scrollerScrollTop ?? 0) > 0 && s.scrollerScrollTop < scrollTopAtEnd, `top=${s.scrollerScrollTop}`);

// ---- Keyboard: ArrowDown on focused slide
await page.locator('[data-index="2"]:visible').focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(700);
s = await state(page);
record('desktop: ArrowDown on slide → 4 / 4', s.counter === '4 / 4', `got ${s.counter}`);
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(700);
s = await state(page);
record('desktop: ArrowUp on slide → 3 / 4', s.counter === '3 / 4', `got ${s.counter}`);

// ---- Fullscreen via slide click
await page.locator('[data-index="2"]:visible').click();
await page.waitForTimeout(600);
s = await state(page);
record('desktop: slide click opens fullscreen', s.fullscreen);
record('desktop: fullscreen counter 3 / 4', s.fsCounter === '3 / 4', `got ${s.fsCounter}`);
record('desktop: fullscreen cursor zoom-out', s.fsCursor === 'zoom-out', `got ${s.fsCursor}`);
record('desktop: body scroll locked', s.scrollLocked);
await shot(page, '05-fullscreen');

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
s = await state(page);
record('desktop: fullscreen ArrowRight → 4 / 4', s.fsCounter === '4 / 4', `got ${s.fsCounter}`);
await page.locator('button[aria-label="Next image"]').click();
await page.waitForTimeout(400);
s = await state(page);
record('desktop: fullscreen next chevron wraps → 1 / 4', s.fsCounter === '1 / 4', `got ${s.fsCounter}`);
await page.locator('button[aria-label="Previous image"]').click();
await page.waitForTimeout(400);
s = await state(page);
record('desktop: fullscreen prev chevron → 4 / 4', s.fsCounter === '4 / 4', `got ${s.fsCounter}`);

await page.mouse.click(30, 30);
await page.waitForTimeout(500);
s = await state(page);
record('desktop: click outside closes fullscreen', !s.fullscreen);
const focusAfter = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? null);
record('desktop: focus restored to slide', focusAfter === 'View image 3 of 4 in fullscreen', `got ${focusAfter}`);

// ---- Zoom button opens fullscreen, ESC closes
await page.locator('button[aria-label="View image in fullscreen"]:visible').click();
await page.waitForTimeout(600);
record('desktop: zoom button opens fullscreen', (await state(page)).fullscreen);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
record('desktop: ESC closes fullscreen', !(await state(page)).fullscreen);

// ---- Badges + buy box intact
const pageInfo = await page.evaluate(() => ({
  badges: [...document.querySelectorAll('span')].filter((s) => /Sale|New|Sold out/.test(s.textContent || '')).length,
  addToBag: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Add to bag')),
  qty: document.querySelector('button[aria-label="Increase quantity"]') !== null,
  accordion: document.querySelector('button[data-radix-collection-item]') !== null || [...document.querySelectorAll('button')].some((b) => /Details|Shipping|Returns/.test(b.textContent || '')),
}));
record('desktop: badges rendered', pageInfo.badges > 0, `got ${pageInfo.badges}`);
record('desktop: Add to bag present', pageInfo.addToBag);
record('desktop: quantity stepper present', pageInfo.qty);
record('desktop: accordions present', pageInfo.accordion);

unwatch();
await context.close();

// ---- Mobile: swipeable horizontal gallery
const mContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mPage = await mContext.newPage();
const unwatchM = watch(mPage);
const cdp = await mContext.newCDPSession(mPage);

await mPage.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await mPage.waitForTimeout(1800);

let m = await state(mPage);
record('mobile: horizontal scroller present', m.scrollerScrollLeft === 0 && m.slideCount === 4, `slides=${m.slideCount}`);
record('mobile: counter visible', m.counter === '1 / 4', `got ${m.counter}`);
record('mobile: thumbnails below image', await mPage.evaluate(() => {
  const scroller = document.querySelector('[class*="snap-x"]');
  const firstThumb = [...document.querySelectorAll('button[aria-label^="View image "][aria-label$="of 4"]')][0];
  if (!scroller || !firstThumb) return false;
  return firstThumb.getBoundingClientRect().top > scroller.getBoundingClientRect().bottom;
}));
record('mobile: no horizontal page overflow', m.overflowX === 0, `got ${m.overflowX}`);

// CDP swipe left
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: 400 }] });
for (let i = 1; i <= 8; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 340 - (220 * i) / 8, y: 400 }] });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await mPage.waitForTimeout(1000);
m = await state(mPage);
record('mobile: swipe left scrolls scroller', (m.scrollerScrollLeft ?? 0) > 0, `left=${m.scrollerScrollLeft}`);
record('mobile: active image 2 after swipe', m.activeThumb === 'View image 2 of 4', `got ${m.activeThumb}`);
record('mobile: counter 2 / 4 after swipe', m.counter === '2 / 4', `got ${m.counter}`);
await shot(mPage, '06-mobile-after-swipe');

// CDP touch swipes leave a never-settling fling in the compositor (real devices settle+snap).
// A bare tap on the scroller commits the scroll state, mirroring a real device's settled carousel.
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 340, y: 400 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await mPage.waitForTimeout(300);

// Thumb tap → scroll to image 3 (click-based: Playwright tap() does not synthesize click in this emulation)
await mPage.locator('button[aria-label="View image 3 of 4"]:visible').click();
await mPage.waitForTimeout(1000);
m = await state(mPage);
record('mobile: thumb tap scrolls to 3 / 4', m.counter === '3 / 4', `got ${m.counter}`);
record('mobile: thumb 3 highlighted', m.activeThumb === 'View image 3 of 4', `got ${m.activeThumb}`);

// Tap slide → fullscreen
await mPage.locator('[data-index="2"]:visible').click();
await mPage.waitForTimeout(600);
m = await state(mPage);
record('mobile: tap opens fullscreen', m.fullscreen);
record('mobile: fullscreen counter 3 / 4', m.fsCounter === '3 / 4', `got ${m.fsCounter}`);

// Swipe in fullscreen modal
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 400 }] });
for (let i = 1; i <= 8; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - (180 * i) / 8, y: 400 }] });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await mPage.waitForTimeout(600);
m = await state(mPage);
record('mobile: fullscreen swipe → 4 / 4', m.fsCounter === '4 / 4', `got ${m.fsCounter}`);
await shot(mPage, '07-mobile-fullscreen');
await mPage.keyboard.press('Escape');
await mPage.waitForTimeout(500);
record('mobile: ESC closes fullscreen', !(await state(mPage)).fullscreen);
unwatchM();
await mContext.close();

// ---- Single-image product regression
const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await c2.newPage();
const unwatch2 = watch(p2);
await p2.goto(`${STORE}/product/ridge-wool-shacket`, { waitUntil: 'networkidle', timeout: 45000 });
await p2.waitForTimeout(1500);
const s2 = await state(p2);
record('single image: no counter', s2.counter === null, `got ${s2.counter}`);
record('single image: no thumbnails', s2.thumbCount === 0, `got ${s2.thumbCount}`);
record('single image: image renders', s2.slideCount === 1, `got ${s2.slideCount}`);
await shot(p2, '08-single-image');
unwatch2();
await c2.close();

await browser.close();

console.log('\n==== STICKY GALLERY VERIFICATION SUMMARY ====');
console.log(`Passed: ${results.filter((r) => r.ok).length} / ${results.length}`);
for (const r of results.filter((x) => !x.ok)) console.log(`  FAILED: ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
if (consoleErrors.length) {
  console.log(`Console errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 10).forEach((e) => console.log('  -', e));
} else {
  console.log('Console errors: none');
}
if (failedHttp.length) {
  console.log(`Failed HTTP (${failedHttp.length}):`);
  failedHttp.slice(0, 10).forEach((e) => console.log('  -', e));
} else {
  console.log('Failed HTTP: none');
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, consoleErrors, failedHttp }, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
