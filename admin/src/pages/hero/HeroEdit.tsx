import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Plus, Trash2, Copy, GripVertical, Upload, Monitor, Smartphone } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { HeroBlock, HeroLinkType, HeroStatus, HeroSlideAnimationType } from '../../types/index';

const MAX_BLOCKS = 100;

type LinkOptions = {
  collections: { _id: string; name: string; slug: string }[];
  categories: { _id: string; name: string; slug: string }[];
  products: { _id: string; name: string; slug: string }[];
};

interface BlockForm {
  localId: string;
  image: string;
  imageMobile: string;
  video: string;
  videoMobile: string;
  eyebrow: string;
  heading: string;
  headingColor: string;
  showEyebrow: boolean;
  showCta: boolean;
  ctaText: string;
  ctaLinkType: HeroLinkType;
  ctaLink: string;
  description: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundColor: string;
  animationType: HeroSlideAnimationType;
  overlay: boolean;
  overlayOpacity: number;
  gradient: boolean;
  textAlign: 'left' | 'center' | 'right';
  buttonColor: string;
  animationSpeed: number;
  priority: number;
  visibilityDesktop: boolean;
  visibilityTablet: boolean;
  visibilityMobile: boolean;
  status: HeroStatus;
  isActive: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  altText: string;
}

interface SetForm {
  name: string;
  status: HeroStatus;
  isActive: boolean;
  priority: number;
  animationSpeed: number;
  blocks: BlockForm[];
}

let idCounter = 0;
const nextId = () => `local-${Date.now()}-${idCounter++}`;

const emptyBlock = (): BlockForm => ({
  localId: nextId(),
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
  animationSpeed: 0.7,
  priority: 0,
  visibilityDesktop: true,
  visibilityTablet: true,
  visibilityMobile: true,
  status: 'draft',
  isActive: true,
  scheduledStart: '',
  scheduledEnd: '',
  altText: '',
});

const emptySet = (): SetForm => ({
  name: '',
  status: 'draft',
  isActive: true,
  priority: 0,
  animationSpeed: 0.7,
  blocks: [emptyBlock()],
});

function toLocalInput(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function fromSlide(s: any, localId?: string): BlockForm {
  return {
    localId: localId ?? nextId(),
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
    animationSpeed: s.animationSpeed ?? 0.7,
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

function normalizeBlockToForm(block: HeroBlock): SetForm {
  const blocks = Array.isArray(block.slides) && block.slides.length > 0
    ? block.slides.map((s) => fromSlide(s))
    : Array.isArray(block.panels) && block.panels.length > 0
      ? block.panels.flatMap((p) => (p.slides ?? []).map((s) => fromSlide(s)))
      : [fromSlide(block)];
  return {
    name: block.name ?? block.title ?? '',
    status: block.status ?? 'draft',
    isActive: block.isActive ?? true,
    priority: block.priority ?? 0,
    animationSpeed: block.animationSpeed ?? 0.7,
    blocks: blocks.length > 0 ? blocks : [emptyBlock()],
  };
}

function UploadField({ value, onChange, label, accept, placeholder }: { value: string; onChange: (url: string) => void; label: React.ReactNode; accept: string; placeholder: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'hero');
      const response = await api.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data?.data?.url;
      if (!url) throw new Error('Upload response missing URL');
      onChange(url);
      toast.success('Uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="flex gap-2 mt-1">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input" placeholder={placeholder} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="admin-btn-secondary shrink-0 px-3 py-2 flex items-center text-xs"
        >
          {uploading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      {accept.startsWith('image') && value ? (
        <img src={value} alt="" className="mt-2 h-24 w-40 object-cover rounded-md border border-slate-200 dark:border-slate-700" />
      ) : null}
    </div>
  );
}

export default function HeroEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState<SetForm>(emptySet);
  const [options, setOptions] = useState<LinkOptions>({ collections: [], categories: [], products: [] });
  const [blockDrag, setBlockDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });

  useEffect(() => {
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

    if (id) {
      api
        .get(`/hero/${id}`)
        .then((response) => {
          setForm(normalizeBlockToForm(response.data.data as HeroBlock));
        })
        .catch(() => {
          toast.error('Failed to fetch hero set');
          navigate('/hero');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const updateSet = useCallback((patch: Partial<SetForm>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const updateBlock = useCallback((idx: number, patch: Partial<BlockForm>) => {
    setForm((f) => ({
      ...f,
      blocks: f.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
  }, []);

  const addBlock = () => {
    setForm((f) => (f.blocks.length >= MAX_BLOCKS ? f : { ...f, blocks: [...f.blocks, emptyBlock()] }));
  };

  const removeBlock = (idx: number) => {
    if (!confirm('Remove this block?')) return;
    setForm((f) => ({ ...f, blocks: f.blocks.filter((_, i) => i !== idx) }));
  };

  const duplicateBlock = (idx: number) => {
    setForm((f) => {
      const copy = { ...f.blocks[idx], localId: nextId(), status: 'draft' as HeroStatus, heading: f.blocks[idx].heading ? `${f.blocks[idx].heading} (Copy)` : '' };
      return { ...f, blocks: [...f.blocks.slice(0, idx + 1), copy, ...f.blocks.slice(idx + 1)] };
    });
    toast.success('Block duplicated (draft)');
  };

  const reorderBlocks = () => {
    const { from, over } = blockDrag;
    if (from === null || over === null || from === over) {
      setBlockDrag({ from: null, over: null });
      return;
    }
    setForm((f) => {
      const next = [...f.blocks];
      const [moved] = next.splice(from, 1);
      next.splice(over, 0, moved);
      return { ...f, blocks: next.map((b, i) => ({ ...b, priority: i })) };
    });
    setBlockDrag({ from: null, over: null });
  };

  const linkOptions = (type: HeroLinkType) => {
    if (type === 'collection') return options.collections;
    if (type === 'category') return options.categories;
    if (type === 'product') return options.products;
    return [];
  };

  const onSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Set name is required');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        animationSpeed: Number(form.animationSpeed),
        priority: Number(form.priority),
        status: form.status,
        isActive: form.isActive,
        slides: form.blocks.map((b, i) => ({
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
      if (isEdit) {
        await api.put(`/hero/${id}`, payload);
        toast.success('Hero set updated');
      } else {
        await api.post('/hero', payload);
        toast.success('Hero set created');
      }
      navigate('/hero');
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to save hero set');
    } finally {
      setSaving(false);
    }
  };

  const previewBlock = useMemo(() => {
    return form.blocks.find((b) => b.status === 'published' && b.isActive) ?? form.blocks[0] ?? null;
  }, [form.blocks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/hero')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isEdit ? 'Edit' : 'Add'} Hero Set</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Blocks feed the infinite strip: 5 per view on desktop, 3 on tablet, 1 (swipeable) on mobile. Storefront updates instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview((v) => !v)} className="admin-btn-secondary py-2.5 px-4 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>
          <button onClick={onSubmit} disabled={saving} className="admin-btn-primary py-2.5 px-4 flex items-center">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
          </button>
        </div>
      </div>

      {showPreview && previewBlock && (
        <div className="admin-card overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Live preview — first published block ({previewBlock.heading || 'Unnamed block'})
          </div>
          <div className="relative h-64 bg-black">
            {previewBlock.image ? <img src={previewBlock.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            {previewBlock.overlay ? (
              <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${Math.min(0.9, Math.max(0, Number(previewBlock.overlayOpacity) / 100))})` }} />
            ) : null}
            {previewBlock.gradient ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 from-60% to-transparent" />
            ) : null}
            <div
              className="absolute left-[6%] bottom-[8%] max-w-[80%]"
              style={{
                color: previewBlock.headingColor || '#FFFFFF',
                textAlign: previewBlock.textAlign,
                display: 'flex',
                flexDirection: 'column',
                alignItems: previewBlock.textAlign === 'center' ? 'center' : previewBlock.textAlign === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              {previewBlock.showEyebrow && previewBlock.eyebrow ? (
                <span className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-lux text-amber-400">
                  <span className="h-px w-8 bg-amber-400" />
                  {previewBlock.eyebrow}
                </span>
              ) : null}
              <h3 className="font-sans font-black uppercase leading-[0.95] tracking-tight text-4xl">{previewBlock.heading || 'Untitled block'}</h3>
              {previewBlock.description ? <p className="mt-3 text-sm opacity-90 max-w-[30ch]">{previewBlock.description}</p> : null}
              {previewBlock.showCta && previewBlock.ctaText ? (
                <span className="mt-5 inline-flex px-4 py-2 text-xs uppercase tracking-wider text-white" style={{ backgroundColor: previewBlock.buttonColor || '#c9a227' }}>
                  {previewBlock.ctaText}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="admin-card p-6 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Set Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="admin-label">Set Name</label>
            <input value={form.name} onChange={(e) => updateSet({ name: e.target.value })} className="admin-input mt-1" placeholder="e.g. Autumn–Winter 2026 Editorial" />
          </div>
          <div>
            <label className="admin-label">Status</label>
            <select value={form.status} onChange={(e) => updateSet({ status: e.target.value as HeroStatus })} className="admin-input mt-1">
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
          <div>
            <label className="admin-label">Display Order (priority, lowest first)</label>
            <input type="number" value={form.priority} onChange={(e) => updateSet({ priority: Number(e.target.value) })} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Default transition speed (seconds, 0.3–4)</label>
            <input type="number" step="0.1" min="0.3" max="4" value={form.animationSpeed} onChange={(e) => updateSet({ animationSpeed: Number(e.target.value) })} className="admin-input mt-1" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {form.blocks.map((block, idx) => (
          <div
            key={block.localId}
            draggable
            onDragStart={() => setBlockDrag({ from: idx, over: idx })}
            onDragOver={(e) => {
              e.preventDefault();
              if (blockDrag.from !== idx) setBlockDrag((d) => ({ ...d, over: idx }));
            }}
            onDrop={reorderBlocks}
            onDragEnd={() => setBlockDrag({ from: null, over: null })}
            className={`admin-card p-5 space-y-4 ${blockDrag.over === idx && blockDrag.from !== null && blockDrag.from !== idx ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${blockDrag.from === idx ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Block {idx + 1}</span>
              <div className="flex items-center gap-2 ml-auto">
                <select value={block.status} onChange={(e) => updateBlock(idx, { status: e.target.value as HeroStatus })} className="admin-input py-1.5 text-sm w-auto">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <input type="checkbox" checked={block.isActive} onChange={(e) => updateBlock(idx, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
                  Active
                </label>
                <button onClick={() => duplicateBlock(idx)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md" title="Duplicate block">
                  <Copy className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => removeBlock(idx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remove block">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadField
                label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Image</span>}
                value={block.image}
                onChange={(url) => updateBlock(idx, { image: url })}
                accept="image/*"
                placeholder="https://… or upload"
              />
              <UploadField
                label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Image (overrides desktop)</span>}
                value={block.imageMobile}
                onChange={(url) => updateBlock(idx, { imageMobile: url })}
                accept="image/*"
                placeholder="https://… or upload"
              />
              <UploadField
                label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Video (optional, overrides image)</span>}
                value={block.video}
                onChange={(url) => updateBlock(idx, { video: url })}
                accept="video/mp4,video/webm"
                placeholder="https://…mp4"
              />
              <UploadField
                label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Video (optional)</span>}
                value={block.videoMobile}
                onChange={(url) => updateBlock(idx, { videoMobile: url })}
                accept="video/mp4,video/webm"
                placeholder="https://…mp4"
              />
              <div>
                <label className="admin-label">Badge / Eyebrow text</label>
                <input value={block.eyebrow} onChange={(e) => updateBlock(idx, { eyebrow: e.target.value })} className="admin-input mt-1" placeholder="e.g. The Autumn–Winter 2026 Collection" />
              </div>
              <div>
                <label className="admin-label">Heading</label>
                <input value={block.heading} onChange={(e) => updateBlock(idx, { heading: e.target.value })} className="admin-input mt-1" placeholder="e.g. The New Season" />
              </div>
              <div>
                <label className="admin-label">Text color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={block.headingColor} onChange={(e) => updateBlock(idx, { headingColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                  <input value={block.headingColor} onChange={(e) => updateBlock(idx, { headingColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="admin-label">Text alignment</label>
                <select value={block.textAlign} onChange={(e) => updateBlock(idx, { textAlign: e.target.value as BlockForm['textAlign'] })} className="admin-input mt-1">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Description (optional)</label>
                <textarea
                  value={block.description}
                  onChange={(e) => updateBlock(idx, { description: e.target.value })}
                  className="admin-input mt-1 min-h-16 resize-y"
                  placeholder="One short line of editorial copy"
                />
              </div>
              <div>
                <label className="admin-label">Show eyebrow / badge</label>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={block.showEyebrow} onChange={(e) => updateBlock(idx, { showEyebrow: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Display badge (hidden by default)</span>
                </label>
              </div>
              <div>
                <label className="admin-label">Show CTA</label>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={block.showCta} onChange={(e) => updateBlock(idx, { showCta: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Display buttons (hidden by default)</span>
                </label>
              </div>
              <div>
                <label className="admin-label">CTA text</label>
                <input value={block.ctaText} onChange={(e) => updateBlock(idx, { ctaText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Explore the collection" />
              </div>
              <div>
                <label className="admin-label">CTA links to</label>
                <select
                  value={block.ctaLinkType}
                  onChange={(e) => updateBlock(idx, { ctaLinkType: e.target.value as HeroLinkType, ctaLink: '' })}
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
                {block.ctaLinkType !== 'custom' ? (
                  <select value={block.ctaLink} onChange={(e) => updateBlock(idx, { ctaLink: e.target.value })} className="admin-input mt-1">
                    <option value="">Select…</option>
                    {linkOptions(block.ctaLinkType).map((o) => (
                      <option key={o._id} value={o.slug}>{o.name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={block.ctaLink} onChange={(e) => updateBlock(idx, { ctaLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
                )}
              </div>
              <div>
                <label className="admin-label">Button color (primary CTA)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={block.buttonColor || '#c9a227'} onChange={(e) => updateBlock(idx, { buttonColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                  <input value={block.buttonColor} onChange={(e) => updateBlock(idx, { buttonColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" placeholder="empty = theme gold" />
                </div>
              </div>
              <div>
                <label className="admin-label">Secondary button text (optional)</label>
                <input value={block.secondaryButtonText} onChange={(e) => updateBlock(idx, { secondaryButtonText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Book a private viewing" />
              </div>
              <div>
                <label className="admin-label">Secondary button link</label>
                <input value={block.secondaryButtonLink} onChange={(e) => updateBlock(idx, { secondaryButtonLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
              </div>
              <div>
                <label className="admin-label">Overlay</label>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={block.overlay} onChange={(e) => updateBlock(idx, { overlay: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Dark overlay on image</span>
                </label>
                {block.overlay ? (
                  <label className="flex items-center gap-3 mt-2">
                    <span className="admin-label">Opacity: {block.overlayOpacity}%</span>
                    <input type="range" min="0" max="90" value={block.overlayOpacity} onChange={(e) => updateBlock(idx, { overlayOpacity: Number(e.target.value) })} className="w-40 accent-amber-500" />
                  </label>
                ) : null}
              </div>
              <div>
                <label className="admin-label">Bottom gradient (readability)</label>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={block.gradient} onChange={(e) => updateBlock(idx, { gradient: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Subtle gradient under text</span>
                </label>
              </div>
              <div>
                <label className="admin-label">Background color (behind media, optional)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={block.backgroundColor || '#0a0a0a'} onChange={(e) => updateBlock(idx, { backgroundColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                  <input value={block.backgroundColor} onChange={(e) => updateBlock(idx, { backgroundColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" placeholder="#0a0a0a (default)" />
                </div>
              </div>
              <div>
                <label className="admin-label">Animation type</label>
                <select value={block.animationType} onChange={(e) => updateBlock(idx, { animationType: e.target.value as HeroSlideAnimationType })} className="admin-input mt-1">
                  <option value="zoom">Zoom (subtle zoom)</option>
                  <option value="fade">Fade (no zoom)</option>
                  <option value="slide">Slide</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Transition speed (seconds, 0.3–4)</label>
                <input type="number" step="0.1" min="0.3" max="4" value={block.animationSpeed} onChange={(e) => updateBlock(idx, { animationSpeed: Number(e.target.value) })} className="admin-input mt-1" />
              </div>
              <div>
                <label className="admin-label">Visibility</label>
                <div className="flex flex-col gap-1.5 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={block.visibilityDesktop} onChange={(e) => updateBlock(idx, { visibilityDesktop: e.target.checked })} className="w-3.5 h-3.5" />
                    Desktop (5-up)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={block.visibilityTablet} onChange={(e) => updateBlock(idx, { visibilityTablet: e.target.checked })} className="w-3.5 h-3.5" />
                    Tablet (3-up)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={block.visibilityMobile} onChange={(e) => updateBlock(idx, { visibilityMobile: e.target.checked })} className="w-3.5 h-3.5" />
                    Mobile (1-up)
                  </label>
                </div>
              </div>
              <div>
                <label className="admin-label">Alt text (SEO)</label>
                <input value={block.altText} onChange={(e) => updateBlock(idx, { altText: e.target.value })} className="admin-input mt-1" />
              </div>
              <div>
                <label className="admin-label">Schedule Start (optional)</label>
                <input type="datetime-local" value={block.scheduledStart} onChange={(e) => updateBlock(idx, { scheduledStart: e.target.value })} className="admin-input mt-1" />
              </div>
              <div>
                <label className="admin-label">Schedule End (optional)</label>
                <input type="datetime-local" value={block.scheduledEnd} onChange={(e) => updateBlock(idx, { scheduledEnd: e.target.value })} className="admin-input mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addBlock}
        disabled={form.blocks.length >= MAX_BLOCKS}
        className="admin-btn-secondary px-4 py-3 w-full flex items-center justify-center disabled:opacity-40"
      >
        <Plus className="w-4 h-4 mr-2" />
        {form.blocks.length >= MAX_BLOCKS ? `Maximum ${MAX_BLOCKS} blocks reached` : 'Add Block'}
      </button>
    </div>
  );
}
