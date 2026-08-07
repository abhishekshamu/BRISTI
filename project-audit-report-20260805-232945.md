# BRISTI Project — Full Audit Report

Date: 2026-08-05 · Mode: READ-ONLY (no source modified) · Baseline backup: `backups/full-audit-20260805-232945/` (16,261 files, verified: 0 missing, 0 hash mismatches)

## 0. Executive Summary

- **Build health: all 3 apps compile clean** — `admin` (vite, 513 kB main chunk + code-split pages), `backend` (tsc), `frontend` (vite). **No critical build-breaking issues found → zero modifications made.**
- Dependency graph: **376 source files, 1,239 import edges, 0 broken imports** (the one flagged `./scripts/ensure-default-admin` resolves correctly on disk), **13 orphans** (5 are entry/type files; 8 are dead code).
- **7 SEV, 46 WARN, 54 INFO** findings across all areas. No SEV breaks the build; all are runtime/security/data issues.

Severity summary by app:

| App | SEV | WARN | INFO |
|-----|-----|------|------|
| Backend/DB/Routes/Auth/API | 2 | 16 | 17 |
| Frontend | 1 | 10 | 12 |
| Admin | 2 | 2 | ~4 |
| Cross-cutting (CMS/Media/SEO/Perf/Sec) | 4 | 18 | 25 |
| **Total (deduped in sections below)** | **7** | **~36** | **~40** |

---

## 1. Dependency Graph

- Total files scanned: 376 (admin 145, frontend 117, backend 114) + `shared/`
- Total edges: 1,239 · External packages: 48 (axios, mongoose, express, three, react-*, recharts, razorpay, stripe, sharp, etc.)
- Broken imports: **0** (verified against disk; `backend/src/index.ts -> ./scripts/ensure-default-admin` resolves to `ensure-default-admin.ts`)
- Orphans (no importers): 13 — expected entries (`admin/src/main.tsx`, `backend/src/index.ts`, `vite-env.d.ts` ×2, `express.d.ts`) + 8 genuine dead files (see §3.1)

---

## 2. Detection Checklist — Direct Answers

| Check | Result | Key evidence |
|-------|--------|--------------|
| Unused files | **8 confirmed dead** | §3.1 |
| Duplicate components | **None functional** (frontend has 3 unused shadcn-style `ui/` files; toast libs duplicated) | §3.2 |
| Duplicate APIs | **5 instances** | §3.3 |
| Broken imports | **0** | depgraph + disk verify |
| Dead routes | **6 routes unreachable** + sitemap emits 2 nonexistent URL patterns | §3.4 |
| Hardcoded content | **Minor drift** ($100 copy, $15 flat rate, marketing copy); no hardcoded product data | §3.5 |
| Missing admin connections | **3 resources** (newsletter, payments, reviews) | §3.6 |
| Broken CRUD | **3 real bugs** (Pages status filter, Roles page, Settings social links) | §3.7 |
| Broken uploads | **0 broken**; 5 warnings (orphan variants, no multer filter, video unverified, public `/uploads`, product-delete cleanup) | §3.8 |
| Broken navigation | **0 dead links**; 2 a11y/SPA issues (EmptyState `<a>`, nested buttons) | §3.9 |
| Broken analytics | **0** (track flow + dashboard endpoints all match) | §3.10 |
| Broken dashboard widgets | **0** | §3.10 |
| Broken charts | **0** (recharts used only in admin, correctly) | §3.10 |
| Broken buttons | **0 dead**; 2 structural issues | §3.11 |
| Broken modals | **0** (only `window.confirm` is the legitimate unsaved-changes guard) | §3.12 |
| Broken loading states | **0** (one bare empty div on account layout — cosmetic) | §3.13 |
| Broken empty states | **0** | §3.13 |
| Broken validations | **Category CRUD has ZERO validation** (dead validators), review validator doesn't strip unknown fields, `PUT /users/password` unvalidated | §3.14 |
| Broken permissions | **RBAC is role-name-only**; `Admin.permissions[]` never enforced; User docs with `role:'admin'` pass admin gates; `optionalAuth` ignores suspended/deleted | §3.15 |

---

## 3. Detailed Findings

### 3.1 Unused Files (dead code — verified, no importers)

| File | Status |
|------|--------|
| `admin/src/hooks/useDebouncedValue.ts` | UNUSED |
| `frontend/src/components/ui/card.tsx` | UNUSED |
| `frontend/src/components/ui/dialog.tsx` | UNUSED |
| `frontend/src/components/ui/tooltip.tsx` | UNUSED |
| `frontend/src/services/coupon.service.ts` | UNUSED (coupons via `cart.service.applyCoupon`) |
| `backend/src/models/Address.ts` | UNUSED (addresses are embedded in User) |
| `backend/src/validators/category.validators.ts` | UNUSED — and category routes run with **zero validation** |
| `shared/constants/index.ts` → `API_ENDPOINTS` export | UNUSED |
| `frontend/src/services/auth.service.ts` → `refresh()` | UNUSED function, targets a nonexistent endpoint |

Unused dependencies: frontend `recharts`, `react-hook-form`, `cmdk`, `embla-carousel-react`, `react-intersection-observer`, `@tanstack/react-table`; backend `socket.io`, `zod`, `uuid`, `compression`.

### 3.2 Duplicate Components

- [INFO] No duplicate components in admin (single shared `ui/`, `media/`, `layout/` sets).
- [INFO] `frontend/src/components/ui/` has 3 unused shadcn-style files (card/dialog/tooltip) — not wired to the actual UI components.
- [INFO] Two toast stacks: `sonner` (all apps) vs `react-hot-toast` (only `frontend/src/pages/TrackOrderPage.tsx:3`).
- [WARN] Duplicate backend repositories: `backend/src/repositories/blog.repository.ts` vs `blogpost.repository.ts` (same model, divergent method sets — regex search ignores the text index).

### 3.3 Duplicate APIs

- [WARN] Admin management implemented twice: `backend/src/routes/admin.routes.ts:27-30` AND `role.routes.ts:25-29` (GET/PUT/DELETE `/:id`, GET `/`).
- [INFO] `GET /api/products/category/:categoryId` vs `GET /api/categories/:categoryId/products`.
- [INFO] `GET /api/products/:productId/reviews` vs `GET /api/reviews/product/:productId`.
- [INFO] `validate` vs `validateRequest` are aliases (`backend/src/validators/index.ts:15`).

### 3.4 Dead / Broken Routes

- [WARN] `/category/:slug` (`frontend/src/App.tsx:56`) — page fully built, zero links point at it (all navigation uses `/shop?category=`).
- [WARN] `/sale`, `/featured`, `/recommended`, `/luxury-collection` — no links anywhere.
- [SEV] Sitemap emits `/blog/:slug` and `/page/:slug` (`backend/src/routes/seo.routes.ts:48,51`) — storefront routes are `/journal/:slug` and there is **no** `/page/:slug`; every blog/CMS sitemap URL 404s. `/privacy`, `/terms`, `/shipping`, `/refund` exist but are omitted.
- [INFO] `frontend/src/lib/seo.ts` BreadcrumbList item 2 → `/products` (route is `/shop`).
- [WARN] Header nav has no fallback: `frontend/src/components/layout/Navbar.tsx:35-38` renders nothing if the settings API fails.

### 3.5 Hardcoded Content

- [WARN] `frontend/src/pages/ProductDetailPage.tsx:333,351` — "$100 free shipping" copy hardcoded while threshold is a setting (`shared/constants/index.ts:489`).
- [INFO] `frontend/src/lib/pricing.ts:6` — `FLAT_SHIPPING_RATE = 15` hardcoded.
- [INFO] Marketing listing pages (BestSellers, etc.) carry hardcoded copy instead of CMS content; home-section headings hardcoded (CustomerReviews:36, LuxuryCategories:40, FeaturedCollections:43, InstagramGallery:19).
- [PASS] No hardcoded product data or external image URLs anywhere in `frontend/src`.

### 3.6 Missing Admin Connections

- [WARN] **Newsletter**: backend `GET /newsletter`, `/newsletter/stats`, `/newsletter/growth-stats` exist (admin-gated) — no admin page or menu entry.
- [WARN] **Payments**: backend `GET /payments`, `PUT /payments/:id/status`, `POST /payments/refund/:id` exist — no admin page.
- [INFO] **Reviews**: no admin moderation list endpoint exists at all (only public/customer routes).

### 3.7 Broken CRUD

- [SEV] `admin/src/pages/cms/Pages.tsx:35` + `PageBuilder.tsx:48` call `GET /pages?status=all` but `backend/src/controllers/page.controller.ts:30-31` forces `filter.status='published'` when `status==='all'` → admin "All Status" view hides drafts/archived.
- [SEV] `admin/src/pages/roles/Roles.tsx` expects `{name,userCount,isSystem}` but `GET /roles` returns Admin docs `{firstName,lastName,email,role,permissions}` → empty role titles, "undefined users", wrong system badges, delete buttons on every account (incl. own super admin); creating a role posts `role: name.toLowerCase()` which the 5-value enum rejects ("Invalid admin role").
- [WARN] `admin/src/pages/settings/Settings.tsx:270` sends capitalized platforms (`Facebook`...) but the backend `Settings` model enum requires lowercase → Mongoose enum validation fails on save and existing links render empty.

### 3.8 Uploads

- [PASS] Admin media flows fully wired (upload, replace, crop, fit, restore-version, bulk ops, verify-url, replace-everywhere).
- [WARN] `backend/src/routes/media.routes.ts:8,26,29` — `upload.any()` with no multer file filter; client mimetype trusted (service allowlist + sharp sniffing covers raster, but mp4/webm stored unverified).
- [WARN] All files served publicly via `express.static(uploadsDir)` (`backend/src/app.ts:110-112`); `MediaFile.isPublic` flag has no effect; `Date.now()`-based filenames are guessable.
- [WARN] Orphaned derived files: remove/replace delete only `metadata.storedPublicIds` (`media.service.ts:742-754,597`) — crop/fit variants and superseded versions never deleted.
- [WARN] Product deletion cascade (`product.service.ts:207-239`) skips `MediaFile` cleanup → orphaned product images.
- [WARN] Cloudinary video deletion always sends `resource_type:'image'` + swallows errors (`media.service.ts:69`) → mp4/webm never delete.
- [INFO] 25 MB cap, MIME remap, checksum dedupe, version history — all enforced.

### 3.9 Navigation

- [PASS] Every hardcoded link in `frontend/src` resolves to a defined route.
- [WARN] `frontend/src/components/shared/EmptyState.tsx:28-30` — action renders `<a href>` inside `Button asChild` instead of router `<Link>` → full page reload; used by CartPage:201, CheckoutPage:103, ProductDetailPage:503, wishlist.
- [WARN] `frontend/src/components/product/ProductCard.tsx:93-115` — interactive buttons nested inside `<Link>` (invalid HTML; works via preventDefault only).

### 3.10 Analytics / Dashboard / Charts

- [PASS] `analyticsService.track` → `POST /analytics/track` exists; fires per route change (`frontend/src/components/layout/Layout.tsx:22`).
- [PASS] Dashboard/analytics endpoints all match: `/admin/dashboard/stats`, `/orders/sales-stats`, `/notifications`, `/analytics/stats`, `/analytics/page-views`, `/analytics`.
- [WARN] `backend/src/controllers/analytics.controller.ts:14` — public track accepts `userId` from request body (spoofable); `ipAddress` never populated.

### 3.11 Buttons

- [PASS] No dead buttons (all onClicks wired); 5 `target="_blank"` links all have `rel="noreferrer"`.
- Structural issues listed in §3.9 (EmptyState anchor, ProductCard nesting).

### 3.12 Modals

- [PASS] All deletes use `ConfirmDialog`; no unopened/unwired modals. Only `window.confirm` remaining: `admin/src/lib/unsaved-context.tsx:32` (legitimate unsaved-changes guard).

### 3.13 Loading & Empty States

- [PASS] All admin list pages handle loading + empty via `DataTable` props or `PageSpinner`/`EmptyState`; storefront pages verified with skeletons/error/empty states.
- [INFO] `frontend/src/pages/account/AccountLayout.tsx:20` — bare empty `<div aria-label="Loading">` (brief blank flash, no spinner).

### 3.14 Validations

- [WARN] **Category CRUD has zero validation** — `backend/src/routes/category.routes.ts:23-25` imports nothing from the dead `category.validators.ts`; invalid slugs/types/isActive pass through.
- [WARN] `backend/src/validators/review.validators.ts:12-17` never strips unknown fields and services pass `req.body` wholesale → `status` field writable by users (enables the SEV in §3.16).
- [INFO] `PUT /api/users/password` has manual checks but no validator middleware.
- [PASS] All admin forms align with backend validators (product, coupon, category, collection, banner, login).

### 3.15 Permissions

- [WARN] `authorize()` checks only the role string (`backend/src/middleware/auth.middleware.ts:100-118`); `Admin.permissions[]` is written but never consulted — Roles page permission checkboxes have no effect, and any `admin` role reaches every admin endpoint.
- [WARN] User docs may carry `role:'admin'` (`shared/types/index.ts:388`) and pass `protect`+`authorize` with none of the Admin-model controls (lockout, `isActive`).
- [INFO] `optionalAuth` rejects only `status==='inactive'` — suspended/deleted users still pass public routes; Admin `isActive` never re-checked.
- [PASS] `protect`/`authorize('admin')` correctly guard all admin CRUD; `super_admin` passes admin checks; payment ownership enforced.

### 3.16 Security (SEV items)

- [SEV] **Hardcoded default admin password** — `backend/src/scripts/ensure-default-admin.ts:10` (`'Admin@123'` fallback) creates a known-password admin on every start unless `NODE_ENV==='production'` (unset env → created in prod too).
- [SEV] **Review IDOR + moderation bypass** — `review.routes.ts:21-22` protect-only; any logged-in user can update/delete ANY review and set `status:'approved'` (`review.service.ts:75-91`).
- [SEV] **Stored XSS via CMS** — `dangerouslySetInnerHTML` on `AboutPage.tsx:40`, `ContactPage.tsx:86`, `BlogDetailPage.tsx:103`, `PolicyPage.tsx:79`; admin content (ReactQuill) saved raw, never sanitized (no DOMPurify anywhere) → script execution + localStorage JWT theft.
- [WARN] **JWTs in localStorage** — `frontend/src/lib/api.ts:13-25` (`bristi_access_token`/`bristi_refresh_token`), `admin/src/lib/api.ts:16` (`admin_token`); cookie-parser configured but unused for tokens.
- [WARN] **Production falls back to empty in-memory MongoDB** — `backend/src/config/database.ts:80` if DNS/MONGODB_URI fails; no `NODE_ENV` guard.
- [WARN] Dev fallback JWT secrets (`jwt.service.ts:15-16`), single-origin CORS string (`app.ts:48-51` — admin origin blocked in prod), full stack traces logged unconditionally (`error.middleware.ts:14-18`), no `trust proxy` → rate limiter ineffective behind proxy.
- [INFO] Helmet + rate limit + bcrypt `select:false` + account lockout + `.env` git-ignored: all positive.

### 3.17 Database

- [WARN] Duplicate `AuthToken.expiresAt` index kills the TTL (expired refresh tokens never purged) — `backend/src/models/AuthToken.ts:40,43`.
- [INFO] `AnalyticsEvent` 90-day TTL commented out (`:78`) — unbounded growth.
- [INFO] No unique slug indexes on Category/Collection/Page/BlogPost (service-layer enforced); dead `Address` model indexes; comprehensive indexes elsewhere.

### 3.18 CMS

- [SEV] `Page.content` is `Schema.Types.Mixed` (`Page.ts:20-23`) — object content crashes storefront render; `builderSections` authored in PageBuilder are **never rendered** on the storefront (block content invisible).
- [WARN] Blog search uses unanchored `$regex`, ignoring the text index (`blog.repository.ts:47-60`).
- [PASS] Public gating correct (published + publishedAt<=now; admin CRUD protected); admin wiring complete.

### 3.19 SEO

- [SEV] `/favicon.svg` + `/og-image.jpg` referenced in `frontend/index.html:5,16,20` and `admin/index.html:5` — both `public/` dirs empty → 404 favicon and broken social-share image.
- [WARN] No sitemap.xml/robots.txt static files (dynamic ones served by backend with placeholder `https://bristi.example.com` base unless `BASE_URL` set — `seo.routes.ts:15`).
- [WARN] Account pages have no title/meta updates; admin `usePageTitle` used in only 2/30 pages.
- [INFO] Runtime meta handling solid (title/description/canonical/OG/Twitter per page via `usePageMeta`); limited JSON-LD (org + product only).

### 3.20 Performance

- [WARN] `three.js` (~1 MB chunk) eager-imported via `ProductViewer` on every product page (`ProductDetailPage.tsx:19`) though 3D mode defaults off — should be `React.lazy`.
- [WARN] N+1: `attachProductCounts` does one `countDocuments` per collection (`collection.service.ts:131-138`).
- [WARN] Source maps shipped in prod (`frontend/vite.config.ts:24`, `admin/vite.config.ts:31`).
- [WARN] Generated variants/srcset barely used (only PromotionBanner) — wasted storage.
- [INFO] Route-level lazy loading everywhere, image lazy-loading broadly applied, schema indexes comprehensive.

---

## 4. Critical Build-Breaking Issues

**None.** All three builds pass (admin 15.7 s, backend tsc, frontend 17.4 s). Per the phase constraints, **no files were modified**.

---

## 5. Recommended Fix Order (for the next phase — not applied)

1. **Security SEVs**: default-admin guard, review IDOR/self-approval, CMS HTML sanitization (DOMPurify on save + render), production DB fallback guard.
2. **Admin CRUD bugs**: Pages `status=all` filter, Roles page ↔ AdminService enum contract, Settings social-platform casing.
3. **SEO**: add favicon/og-image assets, fix sitemap URL patterns to real routes, set `BASE_URL`.
4. **Uploads**: multer file filter, cleanup derived/variant files, product-delete media cascade.
5. **Cleanup**: delete 8 dead files, remove unused deps, consolidate duplicate blog repositories, wire category validators.
6. **Permissions**: enforce `Admin.permissions[]` or remove; close User-role-as-admin gap.
