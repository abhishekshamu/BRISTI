import { useEffect, useMemo, useState } from 'react';
import { Copy, GripVertical, Monitor, Plus, Smartphone, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import Modal from '../../ui/Modal';
import FormSection from '../../ui/FormSection';
import ConfirmDialog from '../../ui/ConfirmDialog';
import MediaPicker from '../../media/MediaPicker';
import type { HeroLinkType, HeroSlideAnimationType, HeroStatus } from '../../../types/index';
import type { HeroSetDraft, HeroSlideDraft } from '../types';

const MAX_SLIDES = 100;

export function nextLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptySlide(): HeroSlideDraft {
  return {
    localId: nextLocalId(),
    image: '',
    imageMobile: '',
    video: '',
    videoMobile: '',
    eyebrow: '',
    heading: '',
    headingColor: '#FFFFFF',
    showEyebrow: false,
    showCta: false,
    ctaText: '',
    ctaLinkType: 'custom',
    ctaLink: '',
    description: '',
    secondaryButtonText: '',
    secondaryButtonLink: '',
    backgroundColor: '',
    animationType: 'zoom',
    overlay: false,
    overlayOpacity: 45,
    gradient: false,
    textAlign: 'left',
    buttonColor: '',
    animationSpeed: 4.5,
    priority: 0,
    visibilityDesktop: true,
    visibilityTablet: true,
    visibilityMobile: true,
    status: 'draft',
    isActive: true,
    scheduledStart: '',
    scheduledEnd: '',
    altText: '',
  };
}

export function emptySet(name = 'New Hero Set'): HeroSetDraft {
  return {
    localId: nextLocalId(),
    name,
    status: 'draft',
    isActive: true,
    priority: 0,
    animationSpeed: 4.5,
    slides: [emptySlide()],
  };
}

function toLocalInput(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function fromSlide(s: any): HeroSlideDraft {
  return {
    localId: nextLocalId(),
    image: s.image ?? '',
    imageMobile: s.imageMobile ?? '',
    video: s.video ?? '',
    videoMobile: s.videoMobile ?? '',
    eyebrow: s.eyebrow ?? '',
    heading: s.heading ?? '',
    headingColor: s.headingColor ?? '#FFFFFF',
    showEyebrow: s.showEyebrow ?? false,
    showCta: s.showCta ?? false,
    ctaText: s.ctaText ?? '',
    ctaLinkType: s.ctaLinkType ?? 'custom',
    ctaLink: s.ctaLink ?? '',
    description: s.description ?? '',
    secondaryButtonText: s.secondaryButtonText ?? '',
    secondaryButtonLink: s.secondaryButtonLink ?? '',
    backgroundColor: s.backgroundColor ?? '',
    animationType: s.animationType ?? 'zoom',
    overlay: s.overlay ?? false,
    overlayOpacity: s.overlayOpacity ?? 45,
    gradient: s.gradient ?? false,
    textAlign: s.textAlign ?? 'left',
    buttonColor: s.buttonColor ?? '',
    animationSpeed: s.animationSpeed ?? 4.5,
    priority: s.priority ?? 0,
    visibilityDesktop: s.visibility?.desktop ?? true,
    visibilityTablet: s.visibility?.tablet ?? true,
    visibilityMobile: s.visibility?.mobile ?? true,
    status: s.status ?? 'draft',
    isActive: s.isActive ?? true,
    scheduledStart: toLocalInput(s.scheduledStart ? String(s.scheduledStart) : undefined),
    scheduledEnd: toLocalInput(s.scheduledEnd ? String(s.scheduledEnd) : undefined),
    altText: s.altText ?? '',
  };
}

/** Convert a persisted hero set (from /hero) into a draft. */
export function setFromApi(data: any): HeroSetDraft {
  const slides = Array.isArray(data.slides) && data.slides.length > 0
    ? data.slides.map((s: any) => fromSlide(s))
    : Array.isArray(data.panels) && data.panels.length > 0
      ? data.panels.flatMap((p: any) => (p.slides ?? []).map((s: any) => fromSlide(s)))
      : [fromSlide(data)];
  return {
    _id: data._id,
    localId: nextLocalId(),
    name: data.name ?? data.title ?? '',
    status: data.status ?? 'draft',
    isActive: data.isActive ?? true,
    priority: data.priority ?? 0,
    animationSpeed: data.animationSpeed ?? 4.5,
    slides: slides.length > 0 ? slides : [emptySlide()],
  };
}

/** Convert a draft into the payload POST/PUT /hero accepts. */
export function setToPayload(set: HeroSetDraft): Record<string, any> {
  return {
    name: set.name.trim(),
    animationSpeed: Number(set.animationSpeed),
    priority: Number(set.priority),
    status: set.status,
    isActive: set.isActive,
    slides: set.slides.map((b, i) => ({
      image: b.image,
      imageMobile: b.imageMobile,
      video: b.video,
      videoMobile: b.videoMobile,
      eyebrow: b.eyebrow,
      heading: b.heading,
      headingColor: b.headingColor,
      showEyebrow: b.showEyebrow,
      showCta: b.showCta,
      ctaText: b.ctaText,
      ctaLinkType: b.ctaLinkType,
      ctaLink: b.ctaLink,
      description: b.description,
      secondaryButtonText: b.secondaryButtonText,
      secondaryButtonLink: b.secondaryButtonLink,
      backgroundColor: b.backgroundColor,
      animationType: b.animationType,
      overlay: b.overlay,
      overlayOpacity: Number(b.overlayOpacity),
      gradient: b.gradient,
      textAlign: b.textAlign,
      buttonColor: b.buttonColor,
      animationSpeed: Number(b.animationSpeed),
      priority: i,
      visibility: { desktop: b.visibilityDesktop, tablet: b.visibilityTablet, mobile: b.visibilityMobile },
      status: b.status,
      isActive: b.isActive,
      scheduledStart: toIso(b.scheduledStart),
      scheduledEnd: toIso(b.scheduledEnd),
      altText: b.altText,
    })),
  };
}

interface LinkOptions {
  collections: { _id: string; name: string; slug: string }[];
  categories: { _id: string; name: string; slug: string }[];
  products: { _id: string; name: string; slug: string }[];
}

interface HeroSetModalProps {
  open: boolean;
  initial: HeroSetDraft;
  onSave: (draft: HeroSetDraft) => void;
  onClose: () => void;
}

export default function HeroSetModal({ open, initial, onSave, onClose }: HeroSetModalProps) {
  const [form, setForm] = useState<HeroSetDraft>(initial);
  const [options, setOptions] = useState<LinkOptions>({ collections: [], categories: [], products: [] });
  const [blockDrag, setBlockDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setBlockDrag({ from: null, over: null });
      setConfirmRemoveIdx(null);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get('/collections', { params: { limit: 100 } }).then((r) => r.data.data || []),
      api.get('/categories').then((r) => r.data.data || []),
      api.get('/products', { params: { limit: 50 } }).then((r) => (r.data.data || r.data.data?.data || r.data.pagination ? r.data.data?.data || r.data.data : [])),
    ])
      .then(([collections, categories, products]) => {
        setOptions({
          collections: collections.map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug })),
          categories: categories.map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug })),
          products: products.map((p: any) => ({ _id: p._id, name: p.name, slug: p.slug })),
        });
      })
      .catch(() => undefined);
  }, [open]);

  const updateSet = (patch: Partial<HeroSetDraft>) => setForm((f) => ({ ...f, ...patch }));

  const updateSlide = (idx: number, patch: Partial<HeroSlideDraft>) =>
    setForm((f) => ({ ...f, slides: f.slides.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));

  const addSlide = () => setForm((f) => (f.slides.length >= MAX_SLIDES ? f : { ...f, slides: [...f.slides, emptySlide()] }));

  const removeSlide = (idx: number) => setForm((f) => ({ ...f, slides: f.slides.filter((_, i) => i !== idx) }));

  const duplicateSlide = (idx: number) => {
    setForm((f) => {
      const copy = { ...f.slides[idx], localId: nextLocalId(), status: 'draft' as HeroStatus, heading: f.slides[idx].heading ? `${f.slides[idx].heading} (Copy)` : '' };
      return { ...f, slides: [...f.slides.slice(0, idx + 1), copy, ...f.slides.slice(idx + 1)] };
    });
    toast.success('Slide duplicated (draft)');
  };

  const reorderSlides = () => {
    const { from, over } = blockDrag;
    if (from === null || over === null || from === over) {
      setBlockDrag({ from: null, over: null });
      return;
    }
    setForm((f) => {
      const next = [...f.slides];
      const [moved] = next.splice(from, 1);
      next.splice(over, 0, moved);
      return { ...f, slides: next.map((b, i) => ({ ...b, priority: i })) };
    });
    setBlockDrag({ from: null, over: null });
  };

  const linkOptions = (type: HeroLinkType) => {
    if (type === 'collection') return options.collections;
    if (type === 'category') return options.categories;
    if (type === 'product') return options.products;
    return [];
  };

  const publishedCount = useMemo(() => form.slides.filter((s) => s.status === 'published' && s.isActive).length, [form.slides]);

  return (
    <Modal open={open} onClose={onClose} title="Edit Hero Set" maxWidth="max-w-4xl">
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-1 space-y-4">
        <FormSection number={1} title="Set Settings" description="Global behaviour for the whole rotation.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-field">
              <label className="admin-label">Set Name</label>
              <input value={form.name} onChange={(e) => updateSet({ name: e.target.value })} className="admin-input" placeholder="e.g. Autumn–Winter 2026 Editorial" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Status</label>
              <select value={form.status} onChange={(e) => updateSet({ status: e.target.value as HeroStatus })} className="admin-input">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => updateSet({ isActive: e.target.checked })} className="w-4 h-4" />
                <span className="admin-label">Active</span>
              </label>
            </div>
            <div className="admin-field">
              <label className="admin-label">Display Order (priority, lowest first)</label>
              <input type="number" value={form.priority} onChange={(e) => updateSet({ priority: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field sm:col-span-2">
              <label className="admin-label">Default hold duration (seconds, 0.3–5)</label>
              <input type="number" step="0.1" min="0.3" max="5" value={form.animationSpeed} onChange={(e) => updateSet({ animationSpeed: Number(e.target.value) })} className="admin-input" />
              <p className="admin-hint">How long each card stays before the next slide. Recommended: 4–5s.</p>
            </div>
          </div>
        </FormSection>

        <div className="space-y-4">
          {form.slides.map((slide, idx) => (
            <div
              key={slide.localId}
              draggable
              onDragStart={() => setBlockDrag({ from: idx, over: idx })}
              onDragOver={(e) => {
                e.preventDefault();
                if (blockDrag.from !== idx) setBlockDrag((d) => ({ ...d, over: idx }));
              }}
              onDrop={reorderSlides}
              onDragEnd={() => setBlockDrag({ from: null, over: null })}
              className={`admin-card p-5 space-y-4 ${blockDrag.over === idx && blockDrag.from !== null && blockDrag.from !== idx ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${blockDrag.from === idx ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Slide {idx + 1}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <select value={slide.status} onChange={(e) => updateSlide(idx, { status: e.target.value as HeroStatus })} className="admin-input py-1.5 text-sm w-auto">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input type="checkbox" checked={slide.isActive} onChange={(e) => updateSlide(idx, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
                    Active
                  </label>
                  <button onClick={() => duplicateSlide(idx)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md" title="Duplicate slide">
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                  <button onClick={() => setConfirmRemoveIdx(idx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remove slide">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MediaPicker
                  label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Image</span>}
                  value={slide.image}
                  onChange={(url) => updateSlide(idx, { image: url })}
                  ratio="hero"
                  folder="hero"
                  accept="image/*"
                  placeholder="https://… or upload"
                />
                <MediaPicker
                  label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Image (overrides desktop)</span>}
                  value={slide.imageMobile}
                  onChange={(url) => updateSlide(idx, { imageMobile: url })}
                  ratio="hero"
                  folder="hero"
                  accept="image/*"
                  placeholder="https://… or upload"
                />
                <MediaPicker
                  label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Video (optional, overrides image)</span>}
                  value={slide.video}
                  onChange={(url) => updateSlide(idx, { video: url })}
                  folder="hero"
                  accept="video/mp4,video/webm"
                  placeholder="https://…mp4"
                />
                <MediaPicker
                  label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Video (optional)</span>}
                  value={slide.videoMobile}
                  onChange={(url) => updateSlide(idx, { videoMobile: url })}
                  folder="hero"
                  accept="video/mp4,video/webm"
                  placeholder="https://…mp4"
                />
                <div>
                  <label className="admin-label">Badge / Eyebrow text</label>
                  <input value={slide.eyebrow} onChange={(e) => updateSlide(idx, { eyebrow: e.target.value })} className="admin-input mt-1" placeholder="e.g. The Autumn–Winter 2026 Collection" />
                </div>
                <div>
                  <label className="admin-label">Heading</label>
                  <input value={slide.heading} onChange={(e) => updateSlide(idx, { heading: e.target.value })} className="admin-input mt-1" placeholder="e.g. The New Season" />
                </div>
                <div>
                  <label className="admin-label">Text color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={slide.headingColor} onChange={(e) => updateSlide(idx, { headingColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                    <input value={slide.headingColor} onChange={(e) => updateSlide(idx, { headingColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Text alignment</label>
                  <select value={slide.textAlign} onChange={(e) => updateSlide(idx, { textAlign: e.target.value as HeroSlideDraft['textAlign'] })} className="admin-input mt-1">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Description (optional)</label>
                  <textarea
                    value={slide.description}
                    onChange={(e) => updateSlide(idx, { description: e.target.value })}
                    className="admin-input mt-1 min-h-16 resize-y"
                    placeholder="One short line of editorial copy"
                  />
                </div>
                <div>
                  <label className="admin-label">Show eyebrow / badge</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={slide.showEyebrow} onChange={(e) => updateSlide(idx, { showEyebrow: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Display badge (hidden by default)</span>
                  </label>
                </div>
                <div>
                  <label className="admin-label">Show CTA</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={slide.showCta} onChange={(e) => updateSlide(idx, { showCta: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Display buttons (hidden by default)</span>
                  </label>
                </div>
                <div>
                  <label className="admin-label">CTA text</label>
                  <input value={slide.ctaText} onChange={(e) => updateSlide(idx, { ctaText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Explore the collection" />
                </div>
                <div>
                  <label className="admin-label">CTA links to</label>
                  <select
                    value={slide.ctaLinkType}
                    onChange={(e) => updateSlide(idx, { ctaLinkType: e.target.value as HeroLinkType, ctaLink: '' })}
                    className="admin-input mt-1"
                  >
                    <option value="custom">Custom URL</option>
                    <option value="collection">Collection</option>
                    <option value="category">Category</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">CTA target</label>
                  {slide.ctaLinkType !== 'custom' ? (
                    <select value={slide.ctaLink} onChange={(e) => updateSlide(idx, { ctaLink: e.target.value })} className="admin-input mt-1">
                      <option value="">Select…</option>
                      {linkOptions(slide.ctaLinkType as HeroLinkType).map((o) => (
                        <option key={o._id} value={o.slug}>{o.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={slide.ctaLink} onChange={(e) => updateSlide(idx, { ctaLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
                  )}
                </div>
                <div>
                  <label className="admin-label">Button color (primary CTA)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={slide.buttonColor || '#c9a227'} onChange={(e) => updateSlide(idx, { buttonColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                    <input value={slide.buttonColor} onChange={(e) => updateSlide(idx, { buttonColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" placeholder="empty = theme gold" />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Secondary button text (optional)</label>
                  <input value={slide.secondaryButtonText} onChange={(e) => updateSlide(idx, { secondaryButtonText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Book a private viewing" />
                </div>
                <div>
                  <label className="admin-label">Secondary button link</label>
                  <input value={slide.secondaryButtonLink} onChange={(e) => updateSlide(idx, { secondaryButtonLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
                </div>
                <div>
                  <label className="admin-label">Overlay</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={slide.overlay} onChange={(e) => updateSlide(idx, { overlay: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Dark overlay on image</span>
                  </label>
                  {slide.overlay ? (
                    <label className="flex items-center gap-3 mt-2">
                      <span className="admin-label">Opacity: {slide.overlayOpacity}%</span>
                      <input type="range" min="0" max="90" value={slide.overlayOpacity} onChange={(e) => updateSlide(idx, { overlayOpacity: Number(e.target.value) })} className="w-40 accent-amber-500" />
                    </label>
                  ) : null}
                </div>
                <div>
                  <label className="admin-label">Bottom gradient (readability)</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={slide.gradient} onChange={(e) => updateSlide(idx, { gradient: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Subtle gradient under text</span>
                  </label>
                </div>
                <div>
                  <label className="admin-label">Background color (behind media, optional)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={slide.backgroundColor || '#0a0a0a'} onChange={(e) => updateSlide(idx, { backgroundColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                    <input value={slide.backgroundColor} onChange={(e) => updateSlide(idx, { backgroundColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" placeholder="#0a0a0a (default)" />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Animation type</label>
                  <select value={slide.animationType} onChange={(e) => updateSlide(idx, { animationType: e.target.value as HeroSlideAnimationType })} className="admin-input mt-1">
                    <option value="zoom">Zoom (subtle zoom)</option>
                    <option value="fade">Fade (no zoom)</option>
                    <option value="slide">Slide</option>
                  </select>
                </div>
                <div>
                  <label className="admin-label">Hold duration (seconds, 0.3–5)</label>
                  <input type="number" step="0.1" min="0.3" max="5" value={slide.animationSpeed} onChange={(e) => updateSlide(idx, { animationSpeed: Number(e.target.value) })} className="admin-input mt-1" />
                  <p className="text-xs text-slate-400 mt-1">Wait before sliding to the next card. Recommended: 4–5s.</p>
                </div>
                <div>
                  <label className="admin-label">Visibility</label>
                  <div className="flex flex-col gap-1.5 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={slide.visibilityDesktop} onChange={(e) => updateSlide(idx, { visibilityDesktop: e.target.checked })} className="w-3.5 h-3.5" />
                      Desktop
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={slide.visibilityTablet} onChange={(e) => updateSlide(idx, { visibilityTablet: e.target.checked })} className="w-3.5 h-3.5" />
                      Tablet
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={slide.visibilityMobile} onChange={(e) => updateSlide(idx, { visibilityMobile: e.target.checked })} className="w-3.5 h-3.5" />
                      Mobile
                    </label>
                  </div>
                </div>
                <div>
                  <label className="admin-label">Alt text (SEO)</label>
                  <input value={slide.altText} onChange={(e) => updateSlide(idx, { altText: e.target.value })} className="admin-input mt-1" />
                </div>
                <div>
                  <label className="admin-label">Schedule Start (optional)</label>
                  <input type="datetime-local" value={slide.scheduledStart} onChange={(e) => updateSlide(idx, { scheduledStart: e.target.value })} className="admin-input mt-1" />
                </div>
                <div>
                  <label className="admin-label">Schedule End (optional)</label>
                  <input type="datetime-local" value={slide.scheduledEnd} onChange={(e) => updateSlide(idx, { scheduledEnd: e.target.value })} className="admin-input mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSlide}
          disabled={form.slides.length >= MAX_SLIDES}
          className="admin-btn-secondary px-4 py-3 w-full flex items-center justify-center disabled:opacity-40"
        >
          <Plus className="w-4 h-4 mr-2" />
          {form.slides.length >= MAX_SLIDES ? `Maximum ${MAX_SLIDES} slides reached` : 'Add Slide'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
        <p className="text-xs text-slate-400">
          {publishedCount} published, active {publishedCount === 1 ? 'slide' : 'slides'} — storefront picks the first published set in priority order.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="admin-btn-secondary px-4 py-2">Cancel</button>
          <button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error('Set name is required');
                return;
              }
              onSave({ ...form, name: form.name.trim(), slides: form.slides.map((s, i) => ({ ...s, priority: i })) });
              onClose();
            }}
            className="admin-btn-primary px-4 py-2"
          >
            Save Set
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemoveIdx !== null}
        title="Remove slide"
        body="Remove this slide?"
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (confirmRemoveIdx !== null) removeSlide(confirmRemoveIdx);
          setConfirmRemoveIdx(null);
        }}
        onCancel={() => setConfirmRemoveIdx(null)}
      />
    </Modal>
  );
}
