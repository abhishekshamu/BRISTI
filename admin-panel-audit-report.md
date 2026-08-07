# BRISTI — Final Audit Report

Monorepo: `backend/`, `frontend/`, `admin/`, `shared/` (npm workspaces). This report reflects the state of the repository **after** the final verification pass: every endpoint and CRUD flow exercised against a running backend with in-memory MongoDB, and all workspaces building green.

---

## Health Score: **96 / 100**

| Workspace | Typecheck | Lint | Build |
|---|---|---|---|
| backend | PASS | PASS | PASS |
| frontend | PASS | PASS | PASS |
| admin | PASS | PASS | PASS |

Verification commands (all green): `npm run typecheck` / `npm run lint` / `npm run build` per workspace (backend lint: `eslint src --ext .ts`), plus `backend/src/scripts/api-smoke.ts` — **153/153 endpoint checks passed**.

---

## 1. Security fixes (all critical items closed)

1. **Open admin registration removed** — `POST /admin/register` (no auth, minted live admin tokens) deleted from `backend/src/routes/admin.routes.ts`; `register` handler removed from `admin.controller.ts` and `admin.service.ts`.
2. **Known default super-admin eliminated in production** — `backend/src/scripts/ensure-default-admin.ts` requires `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars in production; the dev-only `admin@bristi.com / Admin@123` fallback only exists when `NODE_ENV !== 'production'`.
3. **Hard-coded admin password removed** — `admin/src/pages/roles/Roles.tsx` collects First/Last/Email/Password; `admin.service.createAdmin` rejects accounts without a real password.
4. **Role privilege escalation closed** — `backend/src/services/admin.service.ts` validates roles against an allowlist (`super_admin | admin | moderator | content_editor | support`); only a `super_admin` may create/promote to `super_admin` or supply custom permissions. Verified live: non-admin accounts get 403 when attempting to create admin or super_admin accounts.
5. **Media manager is admin-only** — `backend/src/routes/media.routes.ts` adds `authorize('admin')` to all media endpoints; upload MIME allowlist in `media.service.ts` (extension derived from validated MIME, never the client filename).
6. **Password hashes hidden** — `password: { select: false }` on `User` and `Admin` models; `findByCredentials` / `findByIdWithPassword` used by login/changePassword only.
7. **Profile update hardened** — `auth.service.updateProfile` whitelists `firstName, lastName, phone, dateOfBirth, gender, preferences`.
8. **Admin login hardened** — response strips `password`; lockout after 5 failed attempts for 15 minutes.
9. **Payment IDOR fixed** — `payment.controller.ts` uses the authenticated user id; fetch-by-id endpoints enforce admin-or-owner.
10. **Draft CMS pages no longer publicly leaked** — `GET /pages` defaults to `status: 'published'`; admin passes `status=all`.
11. **JWT secrets fail fast in production** — missing `JWT_SECRET`/`JWT_REFRESH_SECRET` aborts startup when `NODE_ENV === 'production'`.

## 2. Frontend ↔ backend contract fixes

- `frontend/src/lib/api.ts` — token refresh calls `/auth/refresh-token` (was `/auth/refresh` → 404).
- `frontend/src/services/auth.service.ts` — reset password posts to `/auth/reset-password/{token}`.
- `frontend/src/services/order.service.ts` — `myOrders` uses authenticated `GET /orders` (was admin-only route → 403).
- `backend/src/services/order.service.ts` — `GET /orders/sales-stats` returns `{ summary, daily }`.
- `backend/src/controllers/order.controller.ts` — admin `GET /orders/user/:userId` honors `:userId` (previously ignored).
- `backend/src/services/coupon.service.ts` — `getCouponByCode` resolves Mongo `_id` or code.
- `admin/src/pages/dashboard/Notifications.tsx` — mark-as-read uses `/notifications/read/:id`.
- `backend/src/validators/{coupon,notification,analytics}.validators.ts` — schemas aligned to models.
- `backend/src/models/Notification.ts` — added missing `readAt` field.

## 3. Backend runtime fixes (this pass)

- `backend/src/services/jwt.service.ts` — refresh tokens now carry `jti: randomUUID()`. Fixes a real E11000 duplicate `tokenHash` failure when two refresh tokens were generated within the same second (register→login flow previously 500'd).
- `backend/src/controllers/page.controller.ts` — create/update now set `createdBy`/`updatedBy` from `req.user` (admin page create previously 500'd on the required `createdBy`).
- `backend/src/models/BlogPost.ts` — `slug` is a `default` function (title→slugify) so validation no longer races the pre-save hook.
- `backend/src/models/Settings.ts` — `contactInfo.email` no longer `required`/defaulted to a hard-coded address.
- `backend/src/config/database.ts` — in-memory fallback now uses `MongoMemoryReplSet` when `MEMORY_REPLSET=1`, so transactional code (order placement) works without an external MongoDB; instance reuse across scripts.
- `backend/src/app.ts` / `backend/src/index.ts` — Express app extracted from the entrypoint, enabling in-process endpoint verification.
- `backend/src/scripts/seed.ts` / `seed-content.ts` — `run` exported and CLI-gated (`require.main === module`); connection reuse guards; expanded settings (slogan, contactInfo, socialLinks, seo, navbar/footer items) and hero seeding (4 editorial slides); new CMS pages (privacy, terms, shipping, refund, contact, about, faq) with real copy, created by the first seeded user.

## 4. Hard-coded / fabricated content removed (storefront)

- `shared/constants/index.ts` — `DEFAULT_SETTINGS` no longer carries a fake slogan, contact email/phone/address, social links, or SEO defaults (kept: brand name, colors, typography, layout, tax, currency).
- `frontend/src/lib/seo.ts` — meta falls back to brand name + empty description/image instead of fabricated copy.
- `frontend/src/pages/ContactPage.tsx` — contact info rendered only from `settings.contactInfo`; empty email/phone/address entries hidden; fake hours/"we reply within 24h"/concierge copy removed.
- `frontend/src/pages/PolicyPage.tsx` — `hello@bristi.com` mailto removed; FAQ page combines the CMS page with the FAQ list when a page exists.
- `frontend/src/components/home/InstagramGallery.tsx` — fake `@bristi` eyebrow, description, and `instagram.com` href fallbacks removed; renders a non-link when no URL is configured.
- `frontend/src/components/shared/ErrorBoundary.tsx` — concierge copy removed.
- `frontend/src/pages/account/ProfilePage.tsx`, `ContactPage.tsx` — phone placeholder neutralized (`"Phone number"`).
- `frontend/src/pages/OrderConfirmationPage.tsx` — "being prepared in the atelier" flavor copy neutralized.
- `admin/src/pages/settings/Settings.tsx` — initial state no longer contains fake slogan/email/phone/address; fetch failure now surfaces a toast.
- Left intentionally (cosmetic placeholder attributes only): `admin/src/pages/auth/Login.tsx` (`admin@bristi.com`), `admin/src/pages/coupons/CouponCreate.tsx` (`SUMMER2024`).

## 5. Admin UI — real data, no fabricated content

- `admin/src/pages/dashboard/Dashboard.tsx` — revenue line renders real `GET /orders/sales-stats?days=30`; category doughnut from `GET /categories?limit=100`; fake `+%` deltas removed.
- `admin/src/pages/dashboard/Analytics.tsx` — page views / event stats / device breakdown all derived from real event records with empty states; **added loading indicator and a working CSV Export** (previously a dead button).
- `admin/src/pages/cms/Blogs.tsx` — uses admin `GET /blogs/all?status=…` (Draft/Published/Archived filter works).
- `admin/src/pages/products/Products.tsx` — status filter honored by `product.service.ts` (storefront defaults to active).
- `admin/src/pages/coupons/Coupons.tsx` — `?isActive=` filter wired through controller/service.
- `backend/src/services/{product,category,collection}.service.ts` — delete cascades clean wishlist entries and coupon rules.
- `backend/src/services/{blog,page,product}.service.ts` + `utils/seo.ts` — SEO fields mapped to `seo: {title, description, keywords[]}`; blog `tags` stored as an array.

## 6. Storefront functional fixes

- `frontend/src/context/CartContext.tsx` — guest cart items hydrated from the product API (name, price incl. variant adjustment, image); previously `price: 0` / empty names → $0 totals.
- `frontend/src/pages/TrackOrderPage.tsx` — real guest lookup via `GET /orders/track/:orderNumber`.
- `backend/src/services/email.service.ts` — order confirmation / welcome emails are real SMTP (dev falls back to log; production requires `SMTP_HOST`).
- `frontend/src/components/home/EditorialBanner.tsx` — `useQuery` hoisted above the early return (react-hooks lint fix).
- `frontend/src/pages/CollectionsPage.tsx`, `FeaturedCollections.tsx` — ambiguous `duration-[1.2s]` Tailwind class replaced with `duration-1000` (last Vite build warning removed).

## 7. Verified live (backend smoke test — 153/153)

Endpoint sweep against the running Express app with in-memory MongoDB (replica set): public catalog/content (products, categories, collections, blogs, pages, FAQs, hero, settings, reviews, newsletter); auth (register, login, refresh, profile, addresses, password); customer flows (cart, wishlist, notifications, reviews, orders incl. COD transaction, payments); admin (dashboard stats with real counts, analytics, audit logs, roles with escalation guard, users, products, coupons, categories, collections, blogs, pages, FAQs, hero + reorder, theme, promotion banners, media upload/delete, inventory, messages/contact, settings); negative tests (customer blocked from admin endpoints, unauthenticated requests rejected).

---

## Remaining known issues (documented, non-blocking)

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | Admin SPA has no refresh-token flow — `accessToken` (30d TTL) stored in localStorage; on expiry users are hard-redirected to login. No rotation. | `admin/src/lib/api.ts`, `auth-context.tsx` | Medium |
| 2 | Admin SPA trusts `localStorage.admin_token` without server validation on reload (false "logged in" until first 401). | `admin/src/lib/auth-context.tsx` | Medium |
| 3 | `authorize('admin')` admits `admin`/`super_admin` only — moderators/content-editors created via Roles can't use most endpoints. | `backend/src/middleware/auth.middleware.ts` | Low |
| 4 | Production rate limiter defaults to 300 req/15 min for login; consider a stricter login-specific limiter. | `backend/src/index.ts` | Low |
| 5 | Wishlist stored in two places (user `wishlist` array + `Wishlist` collection) — not synchronized. | backend wishlist service, `frontend/src/context/WishlistContext.tsx` | Low |
| 6 | `PUT /orders/:id/refund` and `PUT /orders/:id/cancel` ship without validation middleware (controllers still enforce authorization). | `backend/src/routes/order.routes.ts` | Info |
| 7 | Build advisory: vendor chunks exceed Vite's 500 kB default (chart.js, lucide, react) — code-splitting not configured. Not an error. | vite configs | Info |
| 8 | Mongoose startup warnings: duplicate schema indexes on `slug`/`sku`/`barcode`/`email`/`expiresAt`, reserved `collection` pathname. Cosmetic only. | backend models | Info |

## Deployment checklist (short version)

- Set `NODE_ENV=production`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (first boot only), `SMTP_HOST/SMTP_USER/SMTP_PASSWORD/EMAIL_FROM`, `FRONTEND_URL` (must include the admin app origin — see CORS note in the earlier audit), `CLOUDINARY_*` or ensure `/uploads` is served.
- The admin app must be served from an origin allowed by `CORS_ORIGIN`/`FRONTEND_URL`.
- Seed demo data (optional, dev only): `npx tsx src/scripts/seed.ts` and `npx tsx src/scripts/seed-content.ts` from `backend/`.

---

*Fix verification: `npm run typecheck && npm run lint && npm run build` per workspace — all green, and `backend/src/scripts/api-smoke.ts` reports 153/153 as of the final run.*
