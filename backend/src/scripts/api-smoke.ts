/**
 * API smoke test — runs the backend against an in-memory MongoDB, seeds demo
 * data, then exercises every public, customer and admin endpoint.
 * Usage: npx tsx src/scripts/api-smoke.ts (from backend/)
 */
process.env.MONGODB_URI = '';
process.env.MEMORY_REPLSET = '1';

import mongoose from 'mongoose';
import sharp from 'sharp';
import { getMongoUri, stopMemoryMongo } from '../config/database';
import { ensureDefaultAdmin } from './ensure-default-admin';
import app from '../app';

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const checks: Check[] = [];
let token = '';
let adminToken = '';
let base = '';

const log = (name: string, pass: boolean, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const idOf = (entry: any): string => entry?._id ?? entry?.id ?? entry?.productId ?? '';
const accessTokenOf = (json: any): string => json?.data?.accessToken ?? json?.accessToken ?? json?.data?.token ?? '';
const asArray = (json: any): any[] => {
  if (!json || typeof json !== 'object') return [];
  const find = (o: any): any[] => {
    if (Array.isArray(o)) return o;
    if (o && typeof o === 'object') {
      for (const key of ['data', 'items', 'results']) {
        if (Array.isArray(o[key])) return o[key];
      }
      for (const key of ['data', 'items', 'results']) {
        const v = o[key];
        if (v && typeof v === 'object') {
          for (const k2 of ['data', 'items', 'results']) {
            if (Array.isArray(v[k2])) return v[k2];
          }
        }
      }
    }
    return [];
  };
  return find(json).length ? find(json) : find(json.data ?? json.result);
};

async function api(
  path: string,
  opts: { method?: string; body?: unknown; auth?: string; rawBody?: BodyInit } = {},
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.Authorization = `Bearer ${opts.auth}`;
  const body = opts.rawBody !== undefined ? opts.rawBody : opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  if (body && opts.rawBody === undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, { method: opts.method ?? 'GET', headers, body });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = undefined;
  }
  return { status: res.status, json };
}

function assert(name: string, res: { status: number; json: any }, expected: number[], extract?: (json: any) => boolean): void {
  const ok = expected.includes(res.status) && (!extract || extract(res.json));
  log(name, ok, `[${res.status}] ${ok ? '' : JSON.stringify(res.json)?.slice(0, 160)}`);
}

async function main(): Promise<void> {
  const uri = await getMongoUri();
  await mongoose.connect(uri);

  const { run: runSeed } = await import('./seed.js');
  await runSeed();
  const { run: runContentSeed } = await import('./seed-content.js');
  await runContentSeed();
  await ensureDefaultAdmin();

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;

  // ---------- Health & public catalog ----------
  assert('GET /health', await api('/health'), [200]);
  {
    const r = await api('/api/products');
    assert('GET /api/products (list)', r, [200], (j) => asArray(j).length > 0);
    const first = asArray(r.json)[0];
    globalThis.__firstProduct = first;
    const byId = await api(`/api/products/${idOf(first)}`);
    assert('GET /api/products/:id', byId, [200]);
    const bySlug = await api(`/api/products/slug/${first.slug}`);
    assert('GET /api/products/slug/:slug', bySlug, [200]);
  }
  for (const route of ['featured', 'new-arrivals', 'on-sale', 'best-sellers', 'trending']) {
    const r = await api(`/api/products/${route}`);
    assert(`GET /api/products/${route}`, r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/products/search?q=trouser');
    assert('GET /api/products/search?q=', r, [200]);
  }
  {
    const r = await api('/api/products/by-ids?ids=');
    log('GET /api/products/by-ids', r.status === 200, `[${r.status}]`);
  }
  {
    const r = await api('/api/categories');
    assert('GET /api/categories', r, [200], (j) => asArray(j).length > 0);
    globalThis.__category = asArray(r.json)[0];
  }
  {
    const r = await api('/api/categories/tree');
    assert('GET /api/categories/tree', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const cat: any = globalThis.__category;
    const bySlug = await api(`/api/categories/slug/${cat.slug}`);
    assert('GET /api/categories/slug/:slug', bySlug, [200]);
  }
  {
    const r = await api('/api/collections');
    assert('GET /api/collections', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/collections/featured');
    assert('GET /api/collections/featured', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/collections/current');
    assert('GET /api/collections/current', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const col: any = asArray((await api('/api/collections')).json)[0];
    const bySlug = await api(`/api/collections/slug/${col.slug}`);
    assert('GET /api/collections/slug/:slug', bySlug, [200]);
  }

  // ---------- Public content ----------
  {
    const r = await api('/api/coupons/validate', { method: 'POST', body: { code: 'NOPE', subtotal: 50 } });
    log('POST /api/coupons/validate (bad code → invalid)', r.json?.data?.valid === false, `[${r.status}] valid=${r.json?.data?.valid}`);
  }
  {
    const r = await api('/api/blogs');
    assert('GET /api/blogs', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/blogs/featured');
    assert('GET /api/blogs/featured', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/blogs/slug/non-existent-slug-xyz');
    log('GET /api/blogs/slug/:slug (404 for missing)', r.status === 404, `[${r.status}]`);
  }
  {
    const r = await api('/api/blogs/stats/blog', { auth: adminToken });
    log('GET /api/blogs/stats/blog (auth-gated)', [401, 403, 200].includes(r.status), `[${r.status}]`);
  }
  {
    const r = await api('/api/pages');
    assert('GET /api/pages', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/pages/slug/privacy');
    assert('GET /api/pages/slug/privacy', r, [200], (j) => Boolean(j.data));
  }
  {
    const r = await api('/api/pages/slug/nope');
    log('GET /api/pages/slug/:slug (404 for missing)', r.status === 404, `[${r.status}]`);
  }
  {
    const r = await api('/api/faqs');
    assert('GET /api/faqs', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/settings');
    assert('GET /api/settings', r, [200], (j) => Boolean(j.data));
  }
  {
    const r = await api('/api/theme');
    assert('GET /api/theme', r, [200]);
  }
  {
    const r = await api('/api/hero');
    assert('GET /api/hero (active blocks)', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/promotion-banners/active');
    assert('GET /api/promotion-banners/active', r, [200]);
  }
  {
    const r = await api('/api/newsletter/subscribe', { method: 'POST', body: { email: 'smoke@example.com' } });
    assert('POST /api/newsletter/subscribe', r, [200, 201]);
  }
  {
    const r = await api('/api/newsletter/subscribe', { method: 'POST', body: { email: 'not-an-email' } });
    log('POST /api/newsletter/subscribe (invalid email rejected)', r.status >= 400, `[${r.status}]`);
  }
  {
    const r = await api('/api/contact', {
      method: 'POST',
      body: { name: 'Smoke Tester', email: 'smoke@example.com', subject: 'General enquiry', message: 'Hello from the smoke test.' },
    });
    assert('POST /api/contact', r, [200, 201]);
  }
  {
    const r = await api('/api/contact', { method: 'POST', body: { name: 'X', email: 'x@example.com', message: 'no subject' } });
    log('POST /api/contact (missing subject rejected)', r.status >= 400, `[${r.status}]`);
  }
  {
    const r = await api('/api/reviews/featured');
    assert('GET /api/reviews/featured', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const p: any = globalThis.__firstProduct;
    const r = await api(`/api/reviews/product/${idOf(p)}`);
    assert('GET /api/reviews/product/:productId', r, [200]);
  }
  {
    const r = await api('/api/search?q=shirt');
    assert('GET /api/search?q=', r, [200]);
  }
  {
    const r = await api('/api/search?q=definitelynotathing');
    assert('GET /api/search (no results, still 200)', r, [200]);
  }

  // ---------- Auth ----------
  {
    const r = await api('/api/auth/register', {
      method: 'POST',
      body: { firstName: 'Smoke', lastName: 'Tester', email: 'smoke.customer@example.com', password: 'Smoke@12345' },
    });
    assert('POST /api/auth/register', r, [201], (j) => Boolean(accessTokenOf(j)));
  }
  {
    const r = await api('/api/auth/register', {
      method: 'POST',
      body: { firstName: 'Smoke', lastName: 'Tester', email: 'smoke.customer@example.com', password: 'Smoke@12345' },
    });
    log('POST /api/auth/register (duplicate email rejected)', r.status >= 400, `[${r.status}]`);
  }
  {
    const r = await api('/api/auth/login', { method: 'POST', body: { email: 'smoke.customer@example.com', password: 'Smoke@12345' } });
    assert('POST /api/auth/login', r, [200], (j) => Boolean(accessTokenOf(j)));
    token = accessTokenOf(r.json);
  }
  {
    const r = await api('/api/auth/login', { method: 'POST', body: { email: 'smoke.customer@example.com', password: 'WrongPass1' } });
    log('POST /api/auth/login (wrong password rejected)', r.status === 401 || r.json?.success === false, `[${r.status}]`);
  }
  {
    const r = await api('/api/auth/me', { auth: token });
    assert('GET /api/auth/me', r, [200]);
  }
  {
    const r = await api('/api/auth/me');
    log('GET /api/auth/me (no token → 401)', r.status === 401, `[${r.status}]`);
  }
  {
    const r = await api('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: token } });
    log('POST /api/auth/refresh-token (graceful)', [200, 401].includes(r.status), `[${r.status}]`);
  }
  {
    const r = await api('/api/auth/update-profile', { method: 'PUT', auth: token, body: { firstName: 'Smoke', lastName: 'Updated' } });
    assert('PUT /api/auth/update-profile', r, [200]);
  }
  {
    const r = await api('/api/auth/change-password', {
      method: 'PUT',
      auth: token,
      body: { currentPassword: 'Smoke@12345', newPassword: 'Smoke@67890' },
    });
    assert('PUT /api/auth/change-password', r, [200]);
  }
  {
    const r = await api('/api/auth/forgot-password', { method: 'POST', body: { email: 'smoke.customer@example.com' } });
    log('POST /api/auth/forgot-password (graceful)', [200, 201, 400, 404].includes(r.status), `[${r.status}]`);
  }
  {
    const r = await api('/api/auth/logout', { method: 'POST', auth: token, body: { refreshToken: token } });
    assert('POST /api/auth/logout', r, [200]);
  }

  // ---------- Customer ----------
  {
    const r = await api('/api/auth/login', { method: 'POST', body: { email: 'smoke.customer@example.com', password: 'Smoke@67890' } });
    token = accessTokenOf(r.json);
    log('Relogin after password change', Boolean(token) && r.status === 200, `[${r.status}]`);
  }
  {
    const r = await api('/api/users/profile', { auth: token });
    assert('GET /api/users/profile', r, [200]);
  }
  {
    const r = await api('/api/users/profile', { method: 'PUT', auth: token, body: { firstName: 'Smoke', lastName: 'Tester', phone: '+1 555 0100' } });
    assert('PUT /api/users/profile', r, [200]);
  }
  {
    const r = await api('/api/users/addresses', {
      method: 'POST',
      auth: token,
      body: {
        type: 'shipping', firstName: 'Smoke', lastName: 'Tester', phone: '+1 555 0100',
        addressLine1: '1 Test Street', city: 'Testville', state: 'TX', postalCode: '12345', country: 'US',
      },
    });
    assert('POST /api/users/addresses', r, [200, 201], (j) => Boolean(j.data));
    const addrId = idOf(r.json.data);
    globalThis.__addrId = addrId;
    const list = await api('/api/users/addresses', { auth: token });
    assert('GET /api/users/addresses', list, [200], (j) => asArray(j).length > 0);
    if (addrId) {
      const upd = await api(`/api/users/addresses/${addrId}`, { method: 'PUT', auth: token, body: { city: 'NewCity' } });
      assert('PUT /api/users/addresses/:id', upd, [200]);
      const del = await api(`/api/users/addresses/${addrId}`, { method: 'DELETE', auth: token });
      assert('DELETE /api/users/addresses/:id', del, [200]);
    }
  }
  {
    const p: any = globalThis.__firstProduct;
    const r = await api('/api/cart/add', { method: 'POST', auth: token, body: { productId: idOf(p), quantity: 1 } });
    assert('POST /api/cart/add', r, [200, 201], (j) => Boolean(j.data));
    const cart = r.json.data;
    globalThis.__cartItemId = idOf((cart.items ?? [])[0]);
    const get = await api('/api/cart', { auth: token });
    assert('GET /api/cart', get, [200]);
    if (globalThis.__cartItemId) {
      const upd = await api(`/api/cart/items/${globalThis.__cartItemId}`, { method: 'PUT', auth: token, body: { quantity: 2 } });
      assert('PUT /api/cart/items/:itemId', upd, [200]);
    }
  }
  {
    const p: any = globalThis.__firstProduct;
    const pid = idOf(p);
    const r = await api('/api/wishlist', { method: 'POST', auth: token, body: { productId: pid } });
    assert('POST /api/wishlist', r, [200, 201]);
    const get = await api('/api/wishlist', { auth: token });
    assert('GET /api/wishlist', get, [200]);
    const chk = await api(`/api/wishlist/check/${pid}`, { auth: token });
    assert('GET /api/wishlist/check/:productId', chk, [200]);
    const del = await api(`/api/wishlist/${pid}`, { method: 'DELETE', auth: token });
    assert('DELETE /api/wishlist/:productId', del, [200]);
  }
  {
    const r = await api('/api/reviews', {
      method: 'POST',
      auth: token,
      body: { productId: idOf(globalThis.__firstProduct), rating: 5, title: 'Smoke review', comment: 'Great piece.' },
    });
    assert('POST /api/reviews', r, [200, 201], (j) => Boolean(j.data));
    const reviewId = idOf(r.json.data);
    if (reviewId) {
      const upd = await api(`/api/reviews/${reviewId}`, { method: 'PUT', auth: token, body: { rating: 4, comment: 'Updated.' } });
      log('PUT /api/reviews/:reviewId', [200].includes(upd.status), `[${upd.status}]`);
      const del = await api(`/api/reviews/${reviewId}`, { method: 'DELETE', auth: token });
      assert('DELETE /api/reviews/:reviewId', del, [200]);
    }
  }
  {
    const r = await api('/api/notifications', { auth: token });
    assert('GET /api/notifications', r, [200], (j) => Array.isArray(j.data));
    const first = (r.json.data ?? [])[0];
    if (first) {
      const mark = await api(`/api/notifications/read/${idOf(first)}`, { method: 'PUT', auth: token });
      assert('PUT /api/notifications/read/:id', mark, [200]);
    }
    const count = await api('/api/notifications/count', { auth: token });
    assert('GET /api/notifications/count', count, [200]);
    const unread = await api('/api/notifications/unread', { auth: token });
    assert('GET /api/notifications/unread', unread, [200]);
    const all = await api('/api/notifications/read-all', { method: 'PUT', auth: token });
    assert('PUT /api/notifications/read-all', all, [200]);
  }
  {
    const r = await api('/api/orders', {
      method: 'POST',
      auth: token,
      body: {
        items: [{ productId: idOf(globalThis.__firstProduct), quantity: 1 }],
        shippingAddress: {
          firstName: 'Smoke', lastName: 'Tester', phone: '+1 555 0100',
          addressLine1: '1 Test Street', city: 'Testville', state: 'TX', postalCode: '12345', country: 'US',
        },
        paymentMethod: 'cod',
      },
    });
    assert('POST /api/orders (COD)', r, [200, 201], (j) => Boolean(j.data), );
    const order = r.json.data ?? {};
    const orderId = idOf(order);
    globalThis.__orderId = orderId;
    globalThis.__orderNumber = order.orderNumber ?? order.order?.orderNumber;
    const mine = await api('/api/orders', { auth: token });
    assert('GET /api/orders (mine)', mine, [200], (j) => asArray(j).length > 0);
    const detail = await api(`/api/orders/${orderId}`, { auth: token });
    assert('GET /api/orders/:id', detail, [200]);
    if (globalThis.__orderNumber) {
      const track = await api(`/api/orders/track/${globalThis.__orderNumber}`);
      assert('GET /api/orders/track/:orderNumber', track, [200]);
    }
  }
  {
    const r = await api('/api/payment', {
      method: 'POST',
      auth: token,
      body: { orderId: globalThis.__orderId, method: 'cod', amount: 100, currency: 'USD', status: 'pending' },
    });
    log('POST /api/payment (record payment)', [200, 201, 400, 422].includes(r.status), `[${r.status}]`);
  }

  // ---------- Admin ----------
  {
    const r = await api('/api/admin/login', { method: 'POST', body: { email: 'admin@bristi.com', password: 'Admin@123' } });
    assert('POST /api/admin/login', r, [200], (j) => Boolean(accessTokenOf(j)));
    adminToken = accessTokenOf(r.json);
  }
  {
    const r = await api('/api/admin/dashboard/stats', { auth: adminToken });
    assert('GET /api/admin/dashboard/stats', r, [200], (j) => Boolean(j.data));
    globalThis.__dash = r.json.data;
    const dash: any = r.json.data;
    log('Dashboard stats are real data (counts > 0, no zero/fake placeholders)',
      Number(dash.userCount) > 0 && Number(dash.productCount) > 0 && Number(dash.orderCount) > 0
      && dash.salesStats && dash.userStats && Array.isArray(dash.recentOrders),
      JSON.stringify({ userCount: dash.userCount, productCount: dash.productCount, orderCount: dash.orderCount }));
  }
  {
    const r = await api('/api/analytics/stats', { auth: adminToken });
    assert('GET /api/analytics/stats', r, [200]);
  }
  {
    const r = await api('/api/analytics/track', {
      method: 'POST',
      body: { eventType: 'page_view', eventName: 'smoke-test', page: '/', sessionId: 'smoke-session' },
    });
    assert('POST /api/analytics/track', r, [200, 201]);
  }
  {
    const r = await api('/api/analytics', { auth: adminToken });
    assert('GET /api/analytics (events after track)', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/analytics/page-views', { auth: adminToken });
    assert('GET /api/analytics/page-views', r, [200]);
  }
  {
    const r = await api('/api/audit', { auth: adminToken });
    assert('GET /api/audit', r, [200]);
  }
  {
    const r = await api('/api/orders/all', { auth: adminToken });
    assert('GET /api/orders/all', r, [200], (j) => asArray(j).length > 0);
    const oid = globalThis.__orderId;
    if (oid) {
      const upd = await api(`/api/orders/${oid}/status`, { method: 'PUT', auth: adminToken, body: { status: 'confirmed' } });
      assert('PUT /api/orders/:id/status', upd, [200]);
      const pay = await api(`/api/orders/${oid}/payment-status`, { method: 'PUT', auth: adminToken, body: { paymentStatus: 'paid' } });
      assert('PUT /api/orders/:id/payment-status', pay, [200]);
      const notes = await api(`/api/orders/${oid}/notes`, { method: 'PUT', auth: adminToken, body: { notes: 'smoke note' } });
      assert('PUT /api/orders/:id/notes', notes, [200]);
      const track = await api(`/api/orders/${oid}/tracking`, { method: 'PUT', auth: adminToken, body: { trackingNumber: 'SMK-123', carrier: 'Test', url: '' } });
      log('PUT /api/orders/:id/tracking', [200].includes(track.status), `[${track.status}] ${JSON.stringify(track.json)?.slice(0, 120)}`);
      const cancel = await api(`/api/orders/${oid}/cancel`, { method: 'PUT', auth: token, body: { reason: 'smoke' } });
      log('PUT /api/orders/:id/cancel (owner)', [200].includes(cancel.status), `[${cancel.status}]`);
    }
  }
  {
    const r = await api('/api/orders/stats', { auth: adminToken });
    assert('GET /api/orders/stats', r, [200]);
  }
  {
    const r = await api('/api/orders/sales-stats', { auth: adminToken });
    assert('GET /api/orders/sales-stats', r, [200]);
  }
  // Coupons CRUD
  {
    const r = await api('/api/coupons', { auth: adminToken });
    assert('GET /api/coupons', r, [200], (j) => Array.isArray(j.data));
  }
  {
    const r = await api('/api/coupons', {
      method: 'POST',
      auth: adminToken,
      body: { code: 'SMOKE10', name: 'Smoke Coupon', type: 'percentage', value: 10, minimumPurchase: 0, maximumDiscount: 50, usageLimit: 100, isActive: true },
    });
    assert('POST /api/coupons', r, [201], (j) => Boolean(j.data));
    const cid = idOf(r.json.data);
    const byCode = await api('/api/coupons/SMOKE10', { auth: adminToken });
    assert('GET /api/coupons/:code', byCode, [200]);
    const valid = await api('/api/coupons/validate', { method: 'POST', body: { code: 'SMOKE10', subtotal: 100 } });
    assert('POST /api/coupons/validate (valid code)', valid, [200], (j) => j.data?.valid === true);
    const upd = await api(`/api/coupons/${cid}`, { method: 'PUT', auth: adminToken, body: { value: 15 } });
    assert('PUT /api/coupons/:id', upd, [200]);
    const del = await api(`/api/coupons/${cid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/coupons/:id', del, [200]);
  }
  // Categories CRUD
  {
    const r = await api('/api/categories', {
      method: 'POST',
      auth: adminToken,
      body: { name: 'Smoke Category', slug: 'smoke-category', level: 1, isActive: true },
    });
    assert('POST /api/categories', r, [201], (j) => Boolean(j.data));
    const cid = idOf(r.json.data);
    const upd = await api(`/api/categories/${cid}`, { method: 'PUT', auth: adminToken, body: { name: 'Smoke Category Updated' } });
    assert('PUT /api/categories/:id', upd, [200]);
    const del = await api(`/api/categories/${cid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/categories/:id', del, [200]);
  }
  // Collections CRUD
  {
    const r = await api('/api/collections', {
      method: 'POST',
      auth: adminToken,
      body: { name: 'Smoke Collection', slug: 'smoke-collection', description: 'tmp', isActive: true },
    });
    assert('POST /api/collections', r, [201], (j) => Boolean(j.data));
    const cid = idOf(r.json.data);
    const upd = await api(`/api/collections/${cid}`, { method: 'PUT', auth: adminToken, body: { name: 'Smoke Collection Updated' } });
    assert('PUT /api/collections/:id', upd, [200]);
    const del = await api(`/api/collections/${cid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/collections/:id', del, [200]);
  }
  // Products CRUD
  {
    const catId = idOf(globalThis.__category);
    const r = await api('/api/products', {
      method: 'POST',
      auth: adminToken,
      body: {
        name: 'Smoke Product', slug: 'smoke-product', category: catId,
        description: 'tmp', price: 99, sku: 'SMK-001', stock: 10,
        options: [{ name: 'Size', values: ['S', 'M'] }],
        status: 'draft',
      },
    });
    assert('POST /api/products', r, [201], (j) => Boolean(j.data));
    const pid = idOf(r.json.data);
    const upd = await api(`/api/products/${pid}`, { method: 'PUT', auth: adminToken, body: { price: 129 } });
    assert('PUT /api/products/:id', upd, [200]);
    const stock = await api(`/api/products/${pid}/stock`, { method: 'PUT', auth: adminToken, body: { quantity: 50 } });
    log('PUT /api/products/:id/stock', [200].includes(stock.status), `[${stock.status}]`);
    const del = await api(`/api/products/${pid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/products/:id', del, [200]);
  }
  // Blogs CRUD
  {
    const r = await api('/api/blogs', {
      method: 'POST',
      auth: adminToken,
      body: { title: 'Smoke Blog Post', content: '<p>hello</p>', author: 'Smoke Tester', status: 'published', tags: ['smoke'] },
    });
    assert('POST /api/blogs', r, [201], (j) => Boolean(j.data));
    const bid = idOf(r.json.data);
    const upd = await api(`/api/blogs/${bid}`, { method: 'PUT', auth: adminToken, body: { title: 'Smoke Blog Updated' } });
    assert('PUT /api/blogs/:id', upd, [200]);
    const del = await api(`/api/blogs/${bid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/blogs/:id', del, [200]);
  }
  // Pages CRUD
  {
    const r = await api('/api/pages', {
      method: 'POST',
      auth: adminToken,
      body: { title: 'Smoke Page', slug: 'smoke-page', content: '<p>x</p>', status: 'published' },
    });
    assert('POST /api/pages', r, [201], (j) => Boolean(j.data));
    const pid = idOf(r.json.data);
    const upd = await api(`/api/pages/${pid}`, { method: 'PUT', auth: adminToken, body: { title: 'Smoke Page Updated' } });
    assert('PUT /api/pages/:id', upd, [200]);
    const del = await api(`/api/pages/${pid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/pages/:id', del, [200]);
  }
  // FAQs CRUD
  {
    const r = await api('/api/faqs', {
      method: 'POST',
      auth: adminToken,
      body: { question: 'Smoke question?', answer: 'Smoke answer.', category: 'Smoke', sortOrder: 99 },
    });
    assert('POST /api/faqs', r, [201], (j) => Boolean(j.data));
    const fid = idOf(r.json.data);
    const upd = await api(`/api/faqs/${fid}`, { method: 'PUT', auth: adminToken, body: { answer: 'Smoke answer updated.' } });
    assert('PUT /api/faqs/:id', upd, [200]);
    const del = await api(`/api/faqs/${fid}`, { method: 'DELETE', auth: adminToken });
    assert('DELETE /api/faqs/:id', del, [200]);
  }
  // Hero CRUD
  {
    const r = await api('/api/hero', {
      method: 'POST',
      auth: adminToken,
      body: {
        name: 'Smoke Hero Set',
        slides: [{
          heading: 'Smoke Hero', eyebrow: 'smoke', description: 'sub',
          primaryCta: { label: 'Shop', url: '/shop' }, secondaryCta: { label: 'Learn', url: '/about' },
          image: 'https://example.com/hero.jpg',
          isActive: true,
        }],
        isActive: true,
      },
    });
    assert('POST /api/hero', r, [201], (j) => Boolean(j.data));
    const hid = idOf(r.json.data);
    const all = await api('/api/hero/all', { auth: adminToken });
    assert('GET /api/hero/all', all, [200], (j) => asArray(j).length > 0);
    if (hid) {
      const upd = await api(`/api/hero/${hid}`, { method: 'PUT', auth: adminToken, body: { name: 'Smoke Hero Set Updated' } });
      assert('PUT /api/hero/:id', upd, [200]);
      const reorder = await api('/api/hero/reorder', { method: 'POST', auth: adminToken, body: { orderedIds: [hid] } });
      log('POST /api/hero/reorder', [200].includes(reorder.status), `[${reorder.status}]`);
      const dup = await api(`/api/hero/${hid}/duplicate`, { method: 'POST', auth: adminToken });
      log('POST /api/hero/:id/duplicate', [200, 201].includes(dup.status), `[${dup.status}]`);
      const del = await api(`/api/hero/${hid}`, { method: 'DELETE', auth: adminToken });
      assert('DELETE /api/hero/:id', del, [200]);
    }
  }
  // Theme CRUD
  {
    const r = await api('/api/theme', { method: 'POST', auth: adminToken, body: { name: 'Smoke Theme', colors: { primary: '#111111' } } });
    assert('POST /api/theme', r, [201], (j) => Boolean(j.data));
    const tid = idOf(r.json.data);
    if (tid) {
      const upd = await api(`/api/theme/${tid}`, { method: 'PUT', auth: adminToken, body: { name: 'Smoke Theme Updated' } });
      assert('PUT /api/theme/:id', upd, [200]);
      const act = await api(`/api/theme/${tid}/activate`, { method: 'PUT', auth: adminToken });
      log('PUT /api/theme/:id/activate', [200].includes(act.status), `[${act.status}]`);
      const del = await api(`/api/theme/${tid}`, { method: 'DELETE', auth: adminToken });
      log('DELETE /api/theme/:id', [200].includes(del.status), `[${del.status}] ${JSON.stringify(del.json)?.slice(0, 120)}`);
    }
  }
  // Promotion banners CRUD
  {
    const r = await api('/api/promotion-banners', {
      method: 'POST',
      auth: adminToken,
      body: { name: 'Smoke Banner', isActive: true, desktopImage: 'https://example.com/b.jpg', redirectUrl: '/shop' },
    });
    assert('POST /api/promotion-banners', r, [201], (j) => Boolean(j.data));
    const bid = idOf(r.json.data);
    if (bid) {
      const upd = await api(`/api/promotion-banners/${bid}`, { method: 'PUT', auth: adminToken, body: { name: 'Smoke Banner Updated' } });
      assert('PUT /api/promotion-banners/:id', upd, [200]);
      const del = await api(`/api/promotion-banners/${bid}`, { method: 'DELETE', auth: adminToken });
      assert('DELETE /api/promotion-banners/:id', del, [200]);
    }
  }
  // Media
  {
    const r = await api('/api/media', { auth: adminToken });
    assert('GET /api/media', r, [200], (j) => Array.isArray(j.data));
    const fd = new FormData();
    fd.append('file', new Blob(['not-a-real-png'], { type: 'image/png' }), 'smoke.png');
    const res = await fetch(`${base}/api/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fd,
    });
    log('POST /api/media (invalid file rejected)', [400].includes(res.status), `[${res.status}]`);
    const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
      .png()
      .toBuffer();
    const good = new FormData();
    good.append('file', new Blob([png as BlobPart], { type: 'image/png' }), 'smoke-valid.png');
    const res2 = await fetch(`${base}/api/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: good,
    });
    const body2 = await res2.json().catch(() => ({}));
    const mediaId = idOf(body2.data);
    log('POST /api/media (upload)', [200, 201].includes(res2.status) && !!mediaId, `[${res2.status}]`);
    if (mediaId) {
      const del = await api(`/api/media/${mediaId}`, { method: 'DELETE', auth: adminToken });
      log('DELETE /api/media/:id', [200, 204].includes(del.status), `[${del.status}]`);
    }
  }
  // Inventory
  {
    const r = await api('/api/inventory', { auth: adminToken });
    assert('GET /api/inventory', r, [200], (j) => Array.isArray(j.data));
    const items = r.json.data ?? [];
    const item = items[0];
    if (item) {
      const upd = await api(`/api/inventory/${idOf(item)}`, { method: 'PUT', auth: adminToken, body: { stock: 10, lowStockThreshold: 3 } });
      assert('PUT /api/inventory/:id', upd, [200]);
      const byProduct = await api(`/api/inventory/product/${item.productId ?? item.product}`, { auth: adminToken });
      log('GET /api/inventory/product/:productId', [200].includes(byProduct.status), `[${byProduct.status}]`);
    }
  }
  {
    const r = await api('/api/inventory/low-stock', { auth: adminToken });
    assert('GET /api/inventory/low-stock', r, [200]);
  }
  {
    const r = await api('/api/inventory/out-of-stock', { auth: adminToken });
    assert('GET /api/inventory/out-of-stock', r, [200]);
  }
  // Newsletter admin
  {
    const r = await api('/api/newsletter', { auth: adminToken });
    assert('GET /api/newsletter (admin)', r, [200], (j) => asArray(j).length > 0);
  }
  {
    const r = await api('/api/newsletter/stats', { auth: adminToken });
    assert('GET /api/newsletter/stats', r, [200]);
  }
  // Contact admin
  {
    const r = await api('/api/contact', { auth: adminToken });
    assert('GET /api/contact (admin)', r, [200], (j) => asArray(j).length > 0);
    const msg = asArray(r.json)[0];
    if (msg) {
      const patch = await api(`/api/contact/${idOf(msg)}/status`, { method: 'PATCH', auth: adminToken, body: { status: 'read' } });
      log('PATCH /api/contact/:id/status', [200].includes(patch.status), `[${patch.status}]`);
    }
  }
  {
    const r = await api('/api/contact/stats', { auth: adminToken });
    assert('GET /api/contact/stats', r, [200]);
  }
  // Users (admin)
  {
    const r = await api('/api/users/customers', { auth: adminToken });
    assert('GET /api/users/customers', r, [200], (j) => asArray(j).length > 0);
  }
  // Admins / roles CRUD
  {
    const r = await api('/api/roles', { auth: adminToken });
    assert('GET /api/roles (admins)', r, [200], (j) => asArray(j).length > 0);
    const r2 = await api('/api/roles', {
      method: 'POST',
      auth: adminToken,
      body: { firstName: 'Temp', lastName: 'Admin', email: 'temp.admin@example.com', password: 'Temp@12345', role: 'moderator', isActive: true },
    });
    assert('POST /api/roles (create admin)', r2, [201], (j) => Boolean(j.data));
    const aid = idOf(r2.json.data);
    if (aid) {
      const upd = await api(`/api/roles/${aid}`, { method: 'PUT', auth: adminToken, body: { role: 'support' } });
      assert('PUT /api/roles/:id', upd, [200]);
      const del = await api(`/api/roles/${aid}`, { method: 'DELETE', auth: adminToken });
      assert('DELETE /api/roles/:id', del, [200]);
    }
  }
  // Role escalation guard
  {
    const r = await api('/api/roles', {
      method: 'POST',
      auth: adminToken,
      body: { firstName: 'Bad', lastName: 'Actor', email: 'bad.actor@example.com', password: 'Bad@12345', role: 'content_editor', isActive: true },
    });
    const created = r.json.data;
    if (created) {
      const badLogin = await api('/api/admin/login', { method: 'POST', body: { email: 'bad.actor@example.com', password: 'Bad@12345' } });
      const badToken = accessTokenOf(badLogin.json);
      const esc = await api('/api/roles', {
        method: 'POST',
        auth: badToken,
        body: { firstName: 'X', lastName: 'Y', email: 'x.y@example.com', password: 'Xy@12345', role: 'admin', isActive: true },
      });
      log('Role escalation blocked (non-admin cannot create admins)', esc.status === 403, `[${esc.status}]`);
      const escSuper = await api('/api/roles', {
        method: 'POST',
        auth: badToken,
        body: { firstName: 'X', lastName: 'Y', email: 'x2.y@example.com', password: 'Xy@12345', role: 'super_admin', isActive: true },
      });
      log('Super-admin role creation blocked for non-super-admin', escSuper.status === 403, `[${escSuper.status}]`);
      const del = await api(`/api/roles/${idOf(created)}`, { method: 'DELETE', auth: adminToken });
      log('Cleanup bad actor', del.status === 200, `[${del.status}]`);
    }
  }
  // Settings admin
  {
    const r = await api('/api/settings', { auth: adminToken });
    assert('GET /api/settings (admin)', r, [200], (j) => Boolean(j.data));
    const upd = await api('/api/settings/contact-info', {
      method: 'PUT',
      auth: adminToken,
      body: { email: 'smoke@example.com', phone: '+1 555 0100', address: '1 Test St' },
    });
    assert('PUT /api/settings/contact-info', upd, [200]);
    const seo = await api('/api/settings/seo', {
      method: 'PUT',
      auth: adminToken,
      body: { defaultTitle: 'Smoke Title', defaultDescription: 'smoke', defaultImage: '' },
    });
    assert('PUT /api/settings/seo', seo, [200]);
    const nav = await api('/api/settings/navbar', {
      method: 'PUT',
      auth: adminToken,
      body: { items: [{ label: 'Shop', url: '/shop', sortOrder: 1, isActive: true }] },
    });
    assert('PUT /api/settings/navbar', nav, [200]);
    const hp = await api('/api/settings/homepage', { method: 'PUT', auth: adminToken, body: { sections: [] } });
    log('PUT /api/settings/homepage', [200].includes(hp.status), `[${hp.status}] ${JSON.stringify(hp.json)?.slice(0, 120)}`);
  }
  // Security: customer token cannot hit admin endpoints
  {
    const r = await api('/api/orders/all', { auth: token });
    log('Customer blocked from admin endpoint', r.status === 403, `[${r.status}]`);
  }

  server.close();
  await mongoose.disconnect();
  await stopMemoryMongo();

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n===== SMOKE RESULT: ${checks.length - failed.length}/${checks.length} passed =====`);
  if (failed.length) {
    failed.forEach((c) => console.log(`FAILED: ${c.name} — ${c.detail}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('SMOKE SCRIPT ERROR:', err);
  process.exit(1);
});
