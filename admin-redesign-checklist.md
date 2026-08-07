# Admin Panel Redesign â€” Internal Checklist

> Backup: `backups/admin-redesign-2026-08-05-1931/` (404 files + MANIFEST.tsv with MD5 hashes)
> Audit date: 2026-08-05 â€” full audit by 4 parallel review agents

## Phase 2 â€” Audit findings (to fix)

### Critical bugs
- [x] tailwind.config.js L33: `--accient` typo breaks `accent` color utilities
- [x] Dashboard KPIs: `salesStats`/`userStats` are arrays â€” page reads as objects â†’ always 0
- [x] Analytics date-range selector never sent to APIs (inert)
- [x] Login error: frontend reads `error.response?.data?.error`, backend sends `.message`
- [x] Categories search input is dead code (searchQuery unused)
- [x] PageBuilder cannot load/edit existing pages (pageSlug never settable)
- [x] OrderDetail "Download PDF" just calls window.print()
- [x] Products/Orders pagination not reset when filter changes
- [x] AuditLogs CSV export lacks quote/commma escaping (Orders has it)
- [x] Inventory Export button is a `toast('coming soon')` stub
- [x] Orders status pill missing `returned` case

### Dead code
- [x] `components/UploadField.tsx` orphaned (zero imports)
- [x] React Query provider + devtools wired but unused app-wide
- [x] cmdk installed, unused (will be used for command palette)
- [x] Empty skeleton dirs: assets, cms, context, hooks, layouts, routes, store, styles, utils + components/{builders,charts,forms,tables,ui}
- [x] `auth-context.register()` â†’ POST /admin/register (no backend route)
- [x] Product form: weight/lowStockThreshold registered but not rendered
- [x] Coupon interface: maximumDiscount, perCustomerLimit, appliesTo, appliesToSaleItems, dates never rendered
- [x] Dashboard StatCard `change` prop never passed (dead delta block)
- [x] Notifications interface relatedId/relatedType never rendered
- [x] HeroEdit dead ternary `folder={isVideo ? 'hero' : 'hero'}`
- [x] HomepageBuilder/PageBuilder section types (product-grid, text, testimonials, newsletter, custom) have no editors

### Consistency targets
- [x] ONE container system: 95vw, max 1700px (no more max-w-2xl/4xl/5xl mixes)
- [x] ONE PageShell (breadcrumb, title, subtitle, back, actions) â€” replace 24 hand-rolled headers
- [x] ONE DataTable (sticky header, sortable, search, filters, bulk, pagination, skeleton, empty) for all list pages
- [x] ONE row-action button (admin-icon-btn with title attrs), kill p-1/p-1.5 mix
- [x] ONE badge pattern (admin-badge + tone variants), kill px-2 py-1 vs py-0.5 mix
- [x] ONE modal wrapper (admin-modal), kill 3 different modal styles
- [x] ONE loading pattern (PageSpinner/skeleton), kill ~12 duplicated spinners (no dark variant)
- [x] ONE empty-state pattern (EmptyState with optional CTA) â€” 4 pages have none
- [x] ONE error extraction helper in api layer (`.message` + `.error` fallback)
- [x] All fetches surface toasts (Faqs/Messages silent console.error)
- [x] `getStatusColor` â†’ shared badge helper (Products/Pages/Blogs copies)
- [x] Save flows: sticky save bar + dirty tracking + unsaved-changes guard everywhere
- [x] Collection icon + SEO-image pickers get proper ratios (no default 4:3 frame)
- [x] TypographyEditor dedupe vs ThemeEditor tab (align font lists, keep both endpoints working)
- [x] NavbarEditor "Icon" field relabeled to favicon semantics

### Global UX
- [x] Dark mode toggle (next-themes mounted, zero UI) â€” header button
- [x] Ctrl+K command palette (cmdk)
- [x] document.title per page
- [x] Error boundary
- [x] Framer-motion page transitions + component polish
- [x] Keyboard shortcuts (save: Ctrl+S on edit pages)
- [x] Notifications: real unread count, pagination aware

## Phase 3 â€” Design system deliverables
- [x] Tokens: spacing/radius/shadow/typography extensions in index.css
- [x] Component classes: badge, table (sticky), toolbar, pagination, skeleton, empty, modal, checkbox, switch, icon-btn, stat-card, search-input, tabs
- [x] ui components: PageShell, DataTable, Badge, Skeleton, EmptyState, Modal, StatCard, StickySaveBar, PageSpinner, IconBtn, ConfirmDialog, CommandPalette, ErrorBoundary, Toolbar
- [x] Hooks: usePageTitle, useUnsavedChanges, useDebouncedValue

## Phase 4 â€” Layout
- [x] AdminLayout: sectioned nav, dark toggle, palette trigger, wider content 95vw/1700px
- [x] Edit pages: sticky sidebar layout where relevant + sticky save bar

## Image management
- [x] 100% of uploaders on MediaPicker/MediaGallery (audit shows done; verify Hero/FAQ/Journal/Brand/Testimonials)
- [x] All pickers pass ratio props

## Final QA
- [x] typecheck, lint, build â€” all workspaces
- [x] Every route renders; no console errors; no React warnings
- [x] Frontend untouched (compare vs backup manifest)


