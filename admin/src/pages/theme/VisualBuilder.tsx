import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Eye, Loader2, Globe2 } from 'lucide-react';
import api, { FRONTEND_URL } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/mediaUrl';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import PageSpinner from '../../components/ui/PageSpinner';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';
import BuilderCanvas from '../../components/builder/BuilderCanvas';
import SectionLibrary from '../../components/builder/SectionLibrary';
import PropertyInspector from '../../components/builder/PropertyInspector';
import { typesForScope, metaFor } from '../../components/builder/sectionTypes';
import { PAGES } from '../../components/builder/pageDefs';
import { blueprintFor, LAYOUT_SECTIONS } from '../../components/builder/blueprints';
import type { BuilderSection, BannerDraft, HeroSetDraft, PageDef, BuilderLiveData } from '../../components/builder/types';
import { setFromApi, setToPayload } from '../../components/builder/hero/HeroSetModal';
import { bannerFromApi, bannerToPayload } from '../../components/builder/banner/BannerEditor';

interface PageMeta {
  id?: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  seo?: { title?: string; description?: string; keywords?: string[] };
  content?: unknown;
  excerpt?: string;
}

interface HomepageBaseline {
  sections: BuilderSection[];
  heroSets: HeroSetDraft[];
  banners: BannerDraft[];
}

const deepEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const clone = (v: any) => JSON.parse(JSON.stringify(v));
const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Canonical homepage rendering order — mirrors frontend/src/pages/HomePage.tsx
const STATIC_ORDER = [
  'hero',
  'luxuryCategories',
  'featuredCollections',
  'newArrivals',
  'bestSellers',
  'trending',
  'customerReviews',
  'journal',
] as const;
const DEFAULT_LIVE_DATA: BuilderLiveData = {
  products: 0,
  collections: 0,
  categories: 0,
  blogs: 0,
  reviews: 0,
  announcements: [],
  navbarItems: 0,
  footerLinks: 0,
  faqs: 0,
};

function mapHomeSections(data: any): BuilderSection[] {
  return (Array.isArray(data) ? data : []).map((s: any, idx: number) => ({
    id: s._id || `section-${idx}-${Date.now()}`,
    type: s.type || 'hero',
    props: s.props || {},
    order: s.sortOrder ?? idx,
  }));
}

const defaultMeta = (def: PageDef): PageMeta => ({
  title: def.label,
  slug: def.slug ?? '',
  status: 'published',
});

export default function VisualBuilder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey = searchParams.get('page') ?? 'homepage';
  const landingId = searchParams.get('id') ?? null;

  const { dirty, setDirty } = useUnsavedChanges();
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [heroSets, setHeroSets] = useState<HeroSetDraft[]>([]);
  const [banners, setBanners] = useState<BannerDraft[]>([]);
  const [liveData, setLiveData] = useState<BuilderLiveData>(DEFAULT_LIVE_DATA);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [allPages, setAllPages] = useState<{ _id: string; title: string; slug: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const baselineRef = useRef<HomepageBaseline | null>(null);

  const def = useMemo<PageDef>(() => {
    const found = PAGES.find((p) => p.key === pageKey);
    if (pageKey === 'landing' && landingId) return { ...(found ?? PAGES[PAGES.length - 1]), slug: null };
    return found ?? PAGES[0];
  }, [pageKey, landingId]);

  const isHomepage = def.store === 'homepage';
  const scope: 'homepage' | 'pages' = isHomepage ? 'homepage' : 'pages';

  // --- Live storefront data (counts + theme settings) ----------------------
  const loadLiveData = async (): Promise<BuilderLiveData> => {
    const [settingsRes, productsRes, collectionsRes, categoriesRes, blogsRes, reviewsRes, faqsRes] = await Promise.allSettled([
      api.get('/settings'),
      api.get('/products', { params: { limit: 1 } }),
      api.get('/collections', { params: { limit: 1 } }),
      api.get('/categories/tree'),
      api.get('/blogs', { params: { limit: 1 } }),
      api.get('/reviews/featured'),
      api.get('/faqs'),
    ]);

    const settings = settingsRes.status === 'fulfilled' ? settingsRes.value.data?.data ?? {} : {};
    const products = productsRes.status === 'fulfilled' ? productsRes.value.data?.pagination?.total ?? 0 : 0;
    const collections = collectionsRes.status === 'fulfilled' ? collectionsRes.value.data?.pagination?.total ?? 0 : 0;
    const categories = categoriesRes.status === 'fulfilled' ? (Array.isArray(categoriesRes.value.data?.data) ? categoriesRes.value.data.data.length : 0) : 0;
    const blogs = blogsRes.status === 'fulfilled' ? blogsRes.value.data?.pagination?.total ?? 0 : 0;
    const reviews = reviewsRes.status === 'fulfilled' ? (Array.isArray(reviewsRes.value.data?.data) ? reviewsRes.value.data.data.length : 0) : 0;
    const faqs = faqsRes.status === 'fulfilled' ? (Array.isArray(faqsRes.value.data?.data) ? faqsRes.value.data.data.length : 0) : 0;

    const announcements = Array.isArray(settings?.announcement?.messages) ? settings.announcement.messages.filter(Boolean) : [];
    const navbarItems = Array.isArray(settings?.navbar?.items) ? settings.navbar.items.filter((i: any) => i.isActive !== false).length : 0;
    const footerLinks = Array.isArray(settings?.footer?.sections)
      ? settings.footer.sections.reduce((sum: number, s: any) => sum + (Array.isArray(s.links) ? s.links.length : 0), 0)
      : 0;

    return { products, collections, categories, blogs, reviews, announcements, navbarItems, footerLinks, faqs };
  };

  // --- Blueprint rows -------------------------------------------------------
  const blueprintRows = (): BuilderSection[] => {
    const layout: BuilderSection[] = LAYOUT_SECTIONS.map((b, i) => ({
      id: `layout-${b.type}`,
      type: b.type,
      label: b.label,
      props: {},
      order: i,
      layout: true,
      live: true,
      visible: true,
    }));
    const page = blueprintFor(pageKey);
    const content: BuilderSection[] = page.map((b, i) => ({
      id: `live-${b.type}-${i}`,
      type: b.type,
      label: b.label,
      props: {},
      order: layout.length + i,
      live: true,
      visible: true,
    }));
    return [...layout, ...content];
  };

  // --- Load on page change ---------------------------------------------------
  useEffect(() => {
    setLoading(true);
    setPreview(false);
    setSelectedId(null);
    setMeta(null);
    setHeroSets([]);
    setBanners([]);
    setLiveData(DEFAULT_LIVE_DATA);
    setDirty(false);

    if (def.store === 'homepage') void loadHome();
    else void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, landingId]);

  const loadHome = async () => {
    try {
      const [live, homeRes, heroRes, bannerRes] = await Promise.all([
        loadLiveData(),
        api.get('/settings/homepage'),
        api.get('/hero/all'),
        api.get('/promotion-banners'),
      ]);
      const configured = mapHomeSections(homeRes.data?.data);
      const sets: HeroSetDraft[] = (heroRes.data?.data ?? []).map((b: any) => setFromApi(b));
      const bannerList: BannerDraft[] = (bannerRes.data?.data ?? []).map((b: any) => bannerFromApi(b));

      // Real frontend order: configured sections first, then the canonical
      // static set appended — exactly like frontend/src/pages/HomePage.tsx.
      const configuredActive = configured.filter((s) => s.visible !== false);
      const orderTypes: string[] = [
        ...configuredActive.map((s) => s.type),
        ...STATIC_ORDER.filter((t) => !configuredActive.some((s) => s.type === t)),
      ];

      const final: BuilderSection[] = orderTypes
        .map((type, idx) => {
          const config = configuredActive.find((s) => s.type === type);
          const isStatic = (STATIC_ORDER as readonly string[]).includes(type);
          return {
            id: config?.id ?? `${type}-${Date.now()}`,
            type,
            props: config?.props ?? {},
            order: idx,
            visible: config?.visible !== false,
            live: isStatic,
          };
        });

      // Auto-migration: keep hero sets / banners reachable even when the
      // corresponding section was never added to the homepage config.
      if (sets.length > 0 && !final.some((s) => s.type === 'hero')) {
        final.unshift({ id: `hero-${Date.now()}`, type: 'hero', props: {}, order: 0, live: false });
        final.forEach((s, i) => { s.order = i; });
      }
      if (bannerList.length > 0 && !final.some((s) => s.type === 'campaign-banner' || s.type === 'campaignBanner')) {
        final.push({ id: `banner-${Date.now()}`, type: 'campaign-banner', props: {}, order: final.length, live: false });
      }

      setSections(final);
      setHeroSets(sets);
      setBanners(bannerList);
      setLiveData(live);
      baselineRef.current = { sections: final, heroSets: sets, banners: bannerList };
    } catch (error) {
      console.error('Failed to load homepage', error);
      toast.error('Failed to load homepage sections');
      setSections(blueprintRows());
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async () => {
    // Blueprint rows mirror the real storefront — the canvas is never empty.
    const blueprint = blueprintRows();
    try {
      const [live, pagesRes] = await Promise.all([
        loadLiveData(),
        api.get('/pages', { params: { status: 'all', limit: 200 } }),
      ]);
      setLiveData(live);
      const list: { _id: string; title: string; slug: string }[] = (pagesRes.data?.data || []).map((p: any) => ({ _id: String(p._id), title: p.title ?? '', slug: p.slug ?? '' }));
      setAllPages(list);

      const applyDoc = (doc: any) => {
        const persisted: BuilderSection[] = (Array.isArray(doc?.builderSections) ? doc.builderSections : []).map((s: any, idx: number) => ({
          id: s._id || `section-${idx}-${Date.now()}`,
          type: s.type || 'text',
          props: s.props || {},
          order: blueprint.length + idx,
          visible: s.isActive !== false,
        }));
        const seo = doc?.seo;
        const seoRow: BuilderSection | null = (seo?.title || seo?.description || (seo?.keywords?.length ?? 0) > 0)
          ? { id: `seo-${Date.now()}`, type: 'seo', props: { seoTitle: seo?.title ?? '', seoDescription: seo?.description ?? '', seoKeywords: (seo?.keywords ?? []).join(', ') }, order: blueprint.length + persisted.length }
          : null;
        setSections(seoRow ? [...blueprint, ...persisted, seoRow] : [...blueprint, ...persisted]);
        setMeta({
          id: doc?._id,
          title: doc?.title ?? '',
          slug: doc?.slug ?? '',
          status: doc?.status ?? 'draft',
          seo,
          content: doc?.content,
          excerpt: doc?.excerpt,
        });
      };

      if (def.store === 'landing') {
        const target = list.find((p) => p._id === landingId);
        if (!target) {
          setSections([]);
          setMeta(null);
          setLoading(false);
          return;
        }
        const detail = await api.get(`/pages/${target._id}`);
        applyDoc(detail.data?.data);
      } else {
        const target = def.slug ? list.find((p) => p.slug === def.slug) : undefined;
        if (target) {
          const detail = await api.get(`/pages/${target._id}`);
          applyDoc(detail.data?.data);
        } else {
          // No CMS page yet — show the live storefront composition.
          setSections(blueprint);
          setMeta({ ...defaultMeta(def), slug: def.slug ?? '' });
        }
      }
    } catch (error) {
      console.error('Failed to load page', error);
      toast.error('Failed to load page — showing live storefront sections');
      setSections(blueprint);
    } finally {
      setLoading(false);
    }
  };

  // --- Mutations -------------------------------------------------------------
  const touch = () => setDirty(true);

  const addSection = (section: BuilderSection) => {
    const { type } = section;
    if (isHomepage) {
      const existing = sections.find((s) => s.type === type);
      if (existing) {
        setSelectedId(existing.id);
        return;
      }
    }
    const next: BuilderSection = { id: `${type}-${Date.now()}`, type, props: {}, order: sections.length, visible: true };
    setSections((prev) => [...prev, next]);
    setSelectedId(next.id);
    touch();
  };

  const removeSection = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (target?.layout) {
      toast('Layout sections are rendered by the storefront on every page and cannot be removed.');
      return;
    }
    if (target?.live && !window.confirm('This section mirrors a live storefront section. Removing it from the canvas does not hide it from shoppers — it only removes it from your page configuration. Continue?')) {
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
    touch();
  };

  const duplicateSection = (id: string) => {
    const source = sections.find((s) => s.id === id);
    if (!source || source.layout) return;
    const copy: BuilderSection = {
      ...clone(source),
      id: `${source.type}-${Date.now()}`,
      props: clone(source.props),
      order: source.order + 1,
      visible: true,
      live: false,
    };
    setSections((prev) => {
      const next = [...prev];
      const at = next.findIndex((s) => s.id === id);
      next.splice(at + 1, 0, copy);
      next.forEach((s, i) => { s.order = i; });
      return next;
    });
    setSelectedId(copy.id);
    touch();
  };

  const toggleVisible = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: s.visible !== false ? false : true } : s)));
    touch();
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setSections((prev) => {
      const next = [...prev];
      const to = direction === 'up' ? index - 1 : index + 1;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      next.forEach((s, i) => { s.order = i; });
      return next;
    });
    touch();
  };

  const reorderSections = (from: number, to: number) => {
    if (from === to) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      next.forEach((s, i) => { s.order = i; });
      return next;
    });
    touch();
  };

  const updateSectionProp = (id: string, key: string, value: any) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s)));
    touch();
  };

  const changeSets = (sets: HeroSetDraft[]) => {
    setHeroSets(sets);
    touch();
  };

  const changeBanners = (banners: BannerDraft[]) => {
    setBanners(banners);
    touch();
  };

  // --- Save system -----------------------------------------------------------
  const saveHome = async () => {
    const known = new Set(typesForScope('homepage').map((t) => t.type));
    const payload = sections
      .filter((s) => !s.live && !s.layout && known.has(s.type))
      .map((s, idx) => ({ type: s.type, props: s.props, sortOrder: s.order ?? idx, isActive: s.visible !== false }));

    const base = baselineRef.current;
    const baseSets = base?.heroSets ?? [];
    const baseBanners = base?.banners ?? [];

    await api.put('/settings/homepage', payload);

    // Hero diff — sets live in their own collection
    const persistedIds = new Set(heroSets.filter((s) => s._id).map((s) => s._id!));
    for (const b of baseSets) {
      if (b._id && !persistedIds.has(b._id)) await api.delete(`/hero/${b._id}`);
    }
    for (const s of heroSets) {
      const baseMatch = s._id ? baseSets.find((b) => b._id === s._id) : undefined;
      const body = setToPayload(s);
      if (s._id && baseMatch) {
        if (!deepEqual(setToPayload(baseMatch), body)) await api.put(`/hero/${s._id}`, body);
      } else if (!baseMatch) {
        const res = await api.post('/hero', body);
        s._id = res.data?.data?._id;
      }
    }
    const baseOrder = baseSets.filter((b) => b._id).map((b) => b._id).join(',');
    const curOrder = heroSets.filter((b) => b._id).map((b) => b._id).join(',');
    if (baseOrder !== curOrder) {
      await api.post('/hero/reorder', { orderedIds: heroSets.filter((b) => b._id).map((b) => b._id!) });
    }

    // Banner diff — banners live in their own collection
    const persistedBannerIds = new Set(banners.filter((b) => b._id).map((b) => b._id!));
    for (const b of baseBanners) {
      if (b._id && !persistedBannerIds.has(b._id)) await api.delete(`/promotion-banners/${b._id}`);
    }
    for (const b of banners) {
      const baseMatch = b._id ? baseBanners.find((x) => x._id === b._id) : undefined;
      const body = bannerToPayload(b);
      if (b._id && baseMatch) {
        if (!deepEqual(bannerToPayload(baseMatch), body)) await api.put(`/promotion-banners/${b._id}`, body);
      } else if (!baseMatch) {
        const res = await api.post('/promotion-banners', body);
        b._id = res.data?.data?._id;
      }
    }

    baselineRef.current = { sections: [...sections], heroSets: clone(heroSets), banners: clone(banners) };
    setDirty(false);
    toast.success('Saved — homepage, hero and banners are live');
  };

  const savePage = async () => {
    if (!meta) return;
    const persistable = sections.filter((s) => !s.live && !s.layout && s.visible !== false);
    const seoSection = sections.find((s) => s.type === 'seo');
    const seo = seoSection
      ? {
          title: seoSection.props.seoTitle || undefined,
          description: seoSection.props.seoDescription || undefined,
          keywords: (seoSection.props.seoKeywords || '')
            .split(',')
            .map((k: string) => k.trim())
            .filter(Boolean),
        }
      : undefined;
    const payload: any = {
      title: meta.title.trim() || def.label,
      slug: meta.slug.trim() || def.slug || slugify(meta.title),
      status: meta.status,
      // Preserve the existing CMS content — About/Contact/FAQ pages render it.
      content: meta.content ?? {},
      ...(meta.excerpt !== undefined ? { excerpt: meta.excerpt } : {}),
      builderSections: persistable
        .filter((s) => s.type !== 'seo')
        .map((s, idx) => ({ type: s.type, props: s.props, size: 'full', sortOrder: s.order ?? idx, isActive: s.visible !== false })),
    };
    if (seo) payload.seo = seo;

    if (meta.id) {
      await api.put(`/pages/${meta.id}`, payload);
    } else {
      const res = await api.post('/pages', payload);
      const doc = res.data?.data;
      setMeta({ id: doc._id, title: doc.title ?? payload.title, slug: doc.slug ?? payload.slug, status: (doc.status ?? 'draft') as 'draft' | 'published', content: doc.content });
    }
    setDirty(false);
    toast.success('Page saved');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isHomepage) await saveHome();
      else await savePage();
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isHomepage) {
      await handleSave();
      return;
    }
    if (!meta) return;
    setMeta({ ...meta, status: 'published' });
    // wait a tick so state is applied before save
    setSections((prev) => {
      setDirty(true);
      return prev;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      setSaving(true);
      await savePage();
      toast.success('Page published and saved');
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to publish — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isHomepage) {
      const base = baselineRef.current;
      if (base) {
        setSections([...base.sections]);
        setHeroSets([...base.heroSets]);
        setBanners([...base.banners]);
      }
    } else {
      void loadPage();
    }
    setSelectedId(null);
    setDirty(false);
  };

  const switchPage = (key: string, id?: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Discard them and switch pages?')) return;
    const next: Record<string, string> = { page: key };
    if (id) next.id = id;
    setSearchParams(next);
  };

  // --- Preview ---------------------------------------------------------------
  const previewSrc = isHomepage ? FRONTEND_URL : meta?.slug ? `${FRONTEND_URL}/${meta.slug}` : null;
  const heroPreviewImage =
    heroSets
      .filter((s) => s.status === 'published' && s.isActive)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))[0]?.slides
      .find((sl) => sl.status === 'published' && sl.isActive)?.image ?? '';

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;
  const pageRoute = def.slug ? `${FRONTEND_URL}/${def.slug}` : isHomepage ? FRONTEND_URL : null;

  if (loading) return <PageSpinner label="Loading Visual Builder" />;

  return (
    <PageShell
      title="Visual Builder"
      subtitle="One builder for every page — the canvas mirrors the live storefront. Compose sections, manage hero and campaigns, and save it all from a single place."
      breadcrumbs={[{ label: 'Theme', to: '/theme' }, { label: 'Visual Builder', to: '/visual-builder' }]}
      actions={
        <div className="flex items-center gap-2">
          {!isHomepage && pageKey !== 'landing' && (
            <button onClick={handlePublish} disabled={saving} className="admin-btn-primary py-2 px-4 flex items-center text-sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Publish
            </button>
          )}
          <button onClick={() => setPreview((v) => !v)} className="admin-btn-secondary py-2 px-4 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            {preview ? 'Exit Preview' : 'Preview'}
          </button>
          {pageRoute ? (
            <a href={pageRoute} target="_blank" rel="noreferrer" className="admin-btn-ghost py-2 px-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Live storefront
            </a>
          ) : null}
        </div>
      }
    >
      {/* Page selector */}
      <div className="admin-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">Page:</label>
          <select value={pageKey} onChange={(e) => switchPage(e.target.value)} className="admin-input !w-auto">
            {PAGES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          {pageKey === 'landing' && (
            <>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">Landing page:</label>
              <select
                value={landingId ?? ''}
                onChange={(e) => {
                  if (e.target.value) switchPage('landing', e.target.value);
                }}
                className="admin-input !w-auto"
              >
                <option value="">Select a landing page…</option>
                {allPages.map((p) => (
                  <option key={p._id} value={p._id}>{p.title || p.slug}</option>
                ))}
              </select>
            </>
          )}
          <span className="admin-badge-slate">{isHomepage ? 'Homepage' : def.label}</span>
          {!isHomepage && meta?.status === 'draft' && <span className="admin-badge-amber">Draft</span>}
          {!isHomepage && meta?.status === 'published' && <span className="admin-badge-green">Published</span>}
          <span className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5" />
            {isHomepage ? FRONTEND_URL : meta?.slug ? `${FRONTEND_URL}/${meta.slug}` : `storefront route — ${def.label.toLowerCase().replace(/\s+/g, '-')}`}
          </span>
        </div>
      </div>

      {pageKey === 'landing' && !landingId ? (
        <div className="admin-card">
          <div className="text-center py-20">
            <p className="text-sm text-slate-500">Select a landing page above to start editing.</p>
          </div>
        </div>
      ) : preview ? (
        <div className="admin-card overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
            <span>Live preview — reflects the current draft (unsaved changes included)</span>
            {previewSrc ? (
              <a href={previewSrc} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> open in new tab
              </a>
            ) : null}
          </div>
          {isHomepage ? (
            <div className="space-y-0 p-6">
              {sections.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No sections on this page yet — add some from the library.</p>
              ) : sections.map((s, i) => {
                const m = metaFor(s.type);
                const Icon = m?.icon ?? Eye;
                const img = s.type === 'hero' ? heroPreviewImage : s.props?.image || s.props?.poster;
                return (
                  <div key={s.id} className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 py-4 last:border-0">
                    <div className="w-24 h-14 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-center">
                      {img ? <img src={resolveMediaUrl(img) ?? ''} alt="" className="w-full h-full object-cover" /> : <Icon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.label ?? m?.label ?? s.type}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {s.type === 'hero' ? `Hero slider — ${heroSets.length} ${heroSets.length === 1 ? 'set' : 'sets'}` : s.type === 'campaign-banner' ? `${banners.length} ${banners.length === 1 ? 'banner' : 'banners'}` : s.props?.title || (s.live ? 'Renders live storefront data' : '')}
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">Section {i + 1}</span>
                  </div>
                );
              })}
            </div>
          ) : previewSrc ? (
            <iframe src={previewSrc} className="w-full h-[72vh]" title="Page preview" />
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">Preview is available after this page is published.</p>
          )}
        </div>
      ) : (
        <>
          {!isHomepage && meta && (
            <div className="admin-card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="admin-label">Page title</label>
                <input value={meta.title} onChange={(e) => { setMeta({ ...meta, title: e.target.value }); touch(); }} className="admin-input mt-1" />
              </div>
              <div>
                <label className="admin-label">Slug</label>
                <input value={meta.slug} onChange={(e) => { setMeta({ ...meta, slug: slugify(e.target.value) }); touch(); }} className="admin-input mt-1" placeholder="about" />
              </div>
              <div>
                <label className="admin-label">Status</label>
                <select value={meta.status} onChange={(e) => { setMeta({ ...meta, status: e.target.value as 'draft' | 'published' }); touch(); }} className="admin-input mt-1">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                {def.store === 'page' ? (
                  <>This page mirrors the storefront <span className="font-mono">/{def.slug}</span> route. Sections marked <span className="text-emerald-600 dark:text-emerald-400 font-medium">live</span> render real storefront data.</>
                ) : (
                  <>This page is rendered entirely from live catalog data — the canvas reflects what shoppers see.</>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <SectionLibrary scope={scope} onAdd={addSection} />
            </div>
            <div className="lg:col-span-2">
              <BuilderCanvas
                sections={sections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorderSections}
                onMove={moveSection}
                onRemove={removeSection}
                onToggleVisible={toggleVisible}
                onDuplicate={duplicateSection}
              />
            </div>
            <div className="lg:col-span-1">
              {selectedSection ? (
                <PropertyInspector
                  section={selectedSection}
                  index={Math.max(0, sections.findIndex((s) => s.id === selectedSection.id))}
                  total={sections.length}
                  heroSets={heroSets}
                  banners={banners}
                  liveData={liveData}
                  onHeroSetsChange={changeSets}
                  onBannersChange={changeBanners}
                  onUpdateProps={updateSectionProp}
                  onMove={moveSection}
                  onRemove={removeSection}
                />
              ) : (
                <div className="admin-card p-6 text-center">
                  <p className="text-sm text-slate-500">Select a section on the canvas to edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {saving ? (
        <div className="flex items-center gap-2 justify-end py-4 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving…
        </div>
      ) : (
        <StickySaveBar
          dirty={dirty}
          saving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
          saveLabel={isHomepage ? 'Save Homepage' : 'Save Page'}
          frontendHref={FRONTEND_URL}
        />
      )}
    </PageShell>
  );
}
