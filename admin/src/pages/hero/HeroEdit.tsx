import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Plus, Trash2, GripVertical, Upload, Monitor, Smartphone } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { HeroBlock, HeroLinkType, HeroStatus } from '../../types/index';

const MAX_PANELS = 5;

type LinkOptions = {
  collections: { _id: string; name: string; slug: string }[];
  categories: { _id: string; name: string; slug: string }[];
  products: { _id: string; name: string; slug: string }[];
};

interface SlideForm {
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
  animationType: 'fade' | 'zoom' | 'slide';
  status: HeroStatus;
  isActive: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  altText: string;
}

interface PanelForm {
  localId: string;
  label: string;
  status: HeroStatus;
  isActive: boolean;
  slides: SlideForm[];
}

interface SetForm {
  name: string;
  status: HeroStatus;
  isActive: boolean;
  priority: number;
  animationSpeed: number;
  gradient: boolean;
  panels: PanelForm[];
}

let idCounter = 0;
const nextId = () => `local-${Date.now()}-${idCounter++}`;

const emptySlide = (): SlideForm => ({
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
  status: 'draft',
  isActive: true,
  scheduledStart: '',
  scheduledEnd: '',
  altText: '',
});

const emptyPanel = (): PanelForm => ({
  localId: nextId(),
  label: '',
  status: 'draft',
  isActive: true,
  slides: [emptySlide()],
});

const emptySet = (): SetForm => ({
  name: '',
  status: 'draft',
  isActive: true,
  priority: 0,
  animationSpeed: 0.7,
  gradient: false,
  panels: [emptyPanel()],
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

function normalizeBlockToForm(block: HeroBlock): SetForm {
  const panels = Array.isArray(block.panels) && block.panels.length > 0
    ? block.panels.map((p) => ({
        localId: nextId(),
        label: p.label ?? '',
        status: p.status ?? 'draft',
        isActive: p.isActive ?? true,
        slides: (p.slides ?? []).map((s) => ({
          localId: nextId(),
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
          status: s.status ?? 'draft',
          isActive: s.isActive ?? true,
          scheduledStart: toLocalInput(s.scheduledStart ? String(s.scheduledStart) : undefined),
          scheduledEnd: toLocalInput(s.scheduledEnd ? String(s.scheduledEnd) : undefined),
          altText: s.altText ?? '',
        })),
      }))
    : [
        {
          localId: nextId(),
          label: '',
          status: block.status ?? 'draft',
          isActive: block.isActive ?? true,
          slides: [
            {
              localId: nextId(),
              image: block.image ?? '',
              imageMobile: block.imageMobile ?? '',
              video: block.video ?? '',
              videoMobile: block.videoMobile ?? '',
              eyebrow: block.badge ?? '',
              heading: block.title ?? '',
              headingColor: '#FFFFFF',
              showEyebrow: false,
              showCta: false,
              ctaText: block.primaryButton?.label ?? '',
              ctaLinkType: block.primaryButton?.linkType ?? 'custom',
              ctaLink: block.primaryButton?.link ?? '',
              description: block.description ?? '',
              secondaryButtonText: block.secondaryButton?.label ?? '',
              secondaryButtonLink: block.secondaryButton?.link ?? '',
              backgroundColor: '',
              animationType: 'zoom' as SlideForm['animationType'],
              status: block.status ?? 'draft',
              isActive: block.isActive ?? true,
              scheduledStart: toLocalInput(block.scheduledStart ? String(block.scheduledStart) : undefined),
              scheduledEnd: toLocalInput(block.scheduledEnd ? String(block.scheduledEnd) : undefined),
              altText: block.altText ?? '',
            },
          ],
        },
      ];
  return {
    name: block.name ?? block.title ?? '',
    status: block.status ?? 'draft',
    isActive: block.isActive ?? true,
    priority: block.priority ?? 0,
    animationSpeed: block.animationSpeed ?? 0.7,
    gradient: block.gradient ?? false,
    panels,
  };
}

function ImageUploadField({ value, onChange, label, placeholder }: { value: string; onChange: (url: string) => void; label: React.ReactNode; placeholder: string }) {
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
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
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
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value ? (
        <img src={value} alt="" className="mt-2 h-24 w-40 object-cover rounded-md border border-slate-200 dark:border-slate-700" />
      ) : null}
    </div>
  );
}

function VideoUrlField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: React.ReactNode }) {
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
      toast.success('Video uploaded');
    } catch {
      toast.error('Video upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="flex gap-2 mt-1">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input" placeholder="https://…mp4" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="admin-btn-secondary shrink-0 px-3 py-2 flex items-center text-xs"
        >
          {uploading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleFile} />
      </div>
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
  const [panelDrag, setPanelDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });
  const [slideDrag, setSlideDrag] = useState<{ panel: number | null; from: number | null; over: number | null }>({
    panel: null,
    from: null,
    over: null,
  });

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

  const updatePanel = useCallback((panelIdx: number, patch: Partial<PanelForm>) => {
    setForm((f) => ({
      ...f,
      panels: f.panels.map((p, i) => (i === panelIdx ? { ...p, ...patch } : p)),
    }));
  }, []);

  const updateSlide = useCallback((panelIdx: number, slideIdx: number, patch: Partial<SlideForm>) => {
    setForm((f) => ({
      ...f,
      panels: f.panels.map((p, i) =>
        i === panelIdx ? { ...p, slides: p.slides.map((s, j) => (j === slideIdx ? { ...s, ...patch } : s)) } : p
      ),
    }));
  }, []);

  const addPanel = () => {
    setForm((f) => (f.panels.length >= MAX_PANELS ? f : { ...f, panels: [...f.panels, emptyPanel()] }));
  };

  const removePanel = (panelIdx: number) => {
    if (!confirm('Remove this panel and all its slides?')) return;
    setForm((f) => ({ ...f, panels: f.panels.filter((_, i) => i !== panelIdx) }));
  };

  const addSlide = (panelIdx: number) => {
    setForm((f) => ({
      ...f,
      panels: f.panels.map((p, i) => (i === panelIdx ? { ...p, slides: [...p.slides, emptySlide()] } : p)),
    }));
  };

  const removeSlide = (panelIdx: number, slideIdx: number) => {
    if (!confirm('Remove this slide?')) return;
    setForm((f) => ({
      ...f,
      panels: f.panels.map((p, i) => (i === panelIdx ? { ...p, slides: p.slides.filter((_, j) => j !== slideIdx) } : p)),
    }));
  };

  const reorderPanels = () => {
    const { from, over } = panelDrag;
    if (from === null || over === null || from === over) {
      setPanelDrag({ from: null, over: null });
      return;
    }
    setForm((f) => {
      const next = [...f.panels];
      const [moved] = next.splice(from, 1);
      next.splice(over, 0, moved);
      return { ...f, panels: next };
    });
    setPanelDrag({ from: null, over: null });
  };

  const reorderSlides = (panelIdx: number) => {
    const { from, over } = slideDrag;
    if (from === null || over === null || from === over) {
      setSlideDrag({ panel: null, from: null, over: null });
      return;
    }
    setForm((f) => ({
      ...f,
      panels: f.panels.map((p, i) => {
        if (i !== panelIdx) return p;
        const next = [...p.slides];
        const [moved] = next.splice(from, 1);
        next.splice(over, 0, moved);
        return { ...p, slides: next };
      }),
    }));
    setSlideDrag({ panel: null, from: null, over: null });
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
        gradient: form.gradient,
        animationSpeed: Number(form.animationSpeed),
        priority: Number(form.priority),
        status: form.status,
        isActive: form.isActive,
        panels: form.panels.map((p) => ({
          label: p.label.trim(),
          status: p.status,
          isActive: p.isActive,
          slides: p.slides.map((s) => ({
            image: s.image,
            imageMobile: s.imageMobile,
            video: s.video,
            videoMobile: s.videoMobile,
            eyebrow: s.eyebrow,
            heading: s.heading,
            headingColor: s.headingColor,
            showEyebrow: s.showEyebrow,
            showCta: s.showCta,
            ctaText: s.ctaText,
            ctaLinkType: s.ctaLinkType,
            ctaLink: s.ctaLink,
            description: s.description,
            secondaryButtonText: s.secondaryButtonText,
            secondaryButtonLink: s.secondaryButtonLink,
            backgroundColor: s.backgroundColor,
            animationType: s.animationType,
            status: s.status,
            isActive: s.isActive,
            scheduledStart: toIso(s.scheduledStart),
            scheduledEnd: toIso(s.scheduledEnd),
            altText: s.altText,
          })),
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

  const previewSlide = useMemo(() => {
    for (const panel of form.panels) {
      const slide = panel.slides.find((s) => s.status === 'published' && s.isActive);
      if (slide) return { panel, slide };
    }
    const panel = form.panels[0];
    return panel ? { panel, slide: panel.slides[0] } : null;
  }, [form.panels]);

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
              Panels show side-by-side on the storefront (up to 3 live); each panel rotates its own slides.
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

      {showPreview && previewSlide && (
        <div className="admin-card overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Live preview — first published slide ({previewSlide.panel.label || 'Unnamed panel'})
          </div>
          <div className="relative h-64 bg-black">
            {previewSlide.slide.image ? <img src={previewSlide.slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            {form.gradient ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 from-60% to-transparent" />
            ) : null}
            <div className="absolute left-[6%] bottom-[8%] max-w-[80%]">
              {previewSlide.slide.showEyebrow && previewSlide.slide.eyebrow ? (
                <span className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-lux text-amber-400">
                  <span className="h-px w-8 bg-amber-400" />
                  {previewSlide.slide.eyebrow}
                </span>
              ) : null}
              <h3
                className="font-sans font-black uppercase leading-[0.95] tracking-tight text-4xl"
                style={{ color: previewSlide.slide.headingColor || '#FFFFFF' }}
              >
                {previewSlide.slide.heading || 'Untitled slide'}
              </h3>
              {previewSlide.slide.showCta && previewSlide.slide.ctaText ? (
                <span className="mt-5 inline-flex bg-amber-500 px-4 py-2 text-xs uppercase tracking-wider text-white">
                  {previewSlide.slide.ctaText}
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
            <label className="admin-label">Slide transition speed (seconds, 0.3–4)</label>
            <input type="number" step="0.1" min="0.3" max="4" value={form.animationSpeed} onChange={(e) => updateSet({ animationSpeed: Number(e.target.value) })} className="admin-input mt-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.gradient} onChange={(e) => updateSet({ gradient: e.target.checked })} className="w-4 h-4" />
            <span className="admin-label">Subtle bottom gradient (off by default)</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {form.panels.map((panel, panelIdx) => (
          <div
            key={panel.localId}
            draggable
            onDragStart={() => setPanelDrag({ from: panelIdx, over: panelIdx })}
            onDragOver={(e) => {
              e.preventDefault();
              if (panelDrag.from !== panelIdx) setPanelDrag((d) => ({ ...d, over: panelIdx }));
            }}
            onDrop={reorderPanels}
            onDragEnd={() => setPanelDrag({ from: null, over: null })}
            className={`admin-card p-5 space-y-4 ${panelDrag.over === panelIdx && panelDrag.from !== null && panelDrag.from !== panelIdx ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${panelDrag.from === panelIdx ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Panel {panelIdx + 1}</span>
              <input
                value={panel.label}
                onChange={(e) => updatePanel(panelIdx, { label: e.target.value })}
                className="admin-input py-1.5 text-sm max-w-xs"
                placeholder="Panel label (admin only)"
              />
              <div className="flex items-center gap-2 ml-auto">
                <select value={panel.status} onChange={(e) => updatePanel(panelIdx, { status: e.target.value as HeroStatus })} className="admin-input py-1.5 text-sm w-auto">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <input type="checkbox" checked={panel.isActive} onChange={(e) => updatePanel(panelIdx, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
                  Active
                </label>
                <button onClick={() => removePanel(panelIdx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remove panel">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {panel.slides.map((slide, slideIdx) => (
                <div
                  key={slide.localId}
                  draggable
                  onDragStart={() => setSlideDrag({ panel: panelIdx, from: slideIdx, over: slideIdx })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (slideDrag.panel === panelIdx && slideDrag.from !== slideIdx) setSlideDrag((d) => ({ ...d, over: slideIdx }));
                  }}
                  onDrop={() => reorderSlides(panelIdx)}
                  onDragEnd={() => setSlideDrag({ panel: null, from: null, over: null })}
                  className={`border border-slate-200 dark:border-slate-700 rounded-md p-4 space-y-3 ${slideDrag.over === slideIdx && slideDrag.panel === panelIdx && slideDrag.from !== slideIdx ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${slideDrag.from === slideIdx && slideDrag.panel === panelIdx ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slide {slideIdx + 1}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <select value={slide.status} onChange={(e) => updateSlide(panelIdx, slideIdx, { status: e.target.value as HeroStatus })} className="admin-input py-1.5 text-sm w-auto">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <input type="checkbox" checked={slide.isActive} onChange={(e) => updateSlide(panelIdx, slideIdx, { isActive: e.target.checked })} className="w-3.5 h-3.5" />
                        Active
                      </label>
                      <button onClick={() => removeSlide(panelIdx, slideIdx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md" title="Remove slide">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadField
                      label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Image</span>}
                      value={slide.image}
                      onChange={(url) => updateSlide(panelIdx, slideIdx, { image: url })}
                      placeholder="https://… or upload"
                    />
                    <ImageUploadField
                      label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Image (overrides desktop)</span>}
                      value={slide.imageMobile}
                      onChange={(url) => updateSlide(panelIdx, slideIdx, { imageMobile: url })}
                      placeholder="https://… or upload"
                    />
                    <VideoUrlField
                      label={<span className="inline-flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Desktop Video (optional, overrides image)</span>}
                      value={slide.video}
                      onChange={(url) => updateSlide(panelIdx, slideIdx, { video: url })}
                    />
                    <VideoUrlField
                      label={<span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile Video (optional)</span>}
                      value={slide.videoMobile}
                      onChange={(url) => updateSlide(panelIdx, slideIdx, { videoMobile: url })}
                    />
                    <div>
                      <label className="admin-label">Eyebrow text</label>
                      <input value={slide.eyebrow} onChange={(e) => updateSlide(panelIdx, slideIdx, { eyebrow: e.target.value })} className="admin-input mt-1" placeholder="e.g. The Autumn–Winter 2026 Collection" />
                    </div>
                    <div>
                      <label className="admin-label">Heading (short — max 3 words)</label>
                      <input value={slide.heading} onChange={(e) => updateSlide(panelIdx, slideIdx, { heading: e.target.value })} className="admin-input mt-1" placeholder="e.g. The New Season" />
                    </div>
                    <div>
                      <label className="admin-label">Heading color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={slide.headingColor} onChange={(e) => updateSlide(panelIdx, slideIdx, { headingColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                        <input value={slide.headingColor} onChange={(e) => updateSlide(panelIdx, slideIdx, { headingColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="admin-label">Show eyebrow</label>
                      <label className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={slide.showEyebrow} onChange={(e) => updateSlide(panelIdx, slideIdx, { showEyebrow: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Display eyebrow line (hidden by default)</span>
                      </label>
                    </div>
                    <div>
                      <label className="admin-label">Show CTA</label>
                      <label className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={slide.showCta} onChange={(e) => updateSlide(panelIdx, slideIdx, { showCta: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Display CTA button (hidden by default)</span>
                      </label>
                    </div>
                    <div>
                      <label className="admin-label">CTA text</label>
                      <input value={slide.ctaText} onChange={(e) => updateSlide(panelIdx, slideIdx, { ctaText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Explore the collection" />
                    </div>
                    <div>
                      <label className="admin-label">CTA links to</label>
                      <select
                        value={slide.ctaLinkType}
                        onChange={(e) => updateSlide(panelIdx, slideIdx, { ctaLinkType: e.target.value as HeroLinkType, ctaLink: '' })}
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
                        <select value={slide.ctaLink} onChange={(e) => updateSlide(panelIdx, slideIdx, { ctaLink: e.target.value })} className="admin-input mt-1">
                          <option value="">Select…</option>
                          {linkOptions(slide.ctaLinkType).map((o) => (
                            <option key={o._id} value={o.slug}>{o.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={slide.ctaLink} onChange={(e) => updateSlide(panelIdx, slideIdx, { ctaLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
                      )}
                    </div>
                    <div>
                      <label className="admin-label">Description (optional, under heading)</label>
                      <textarea
                        value={slide.description}
                        onChange={(e) => updateSlide(panelIdx, slideIdx, { description: e.target.value })}
                        className="admin-input mt-1 min-h-16 resize-y"
                        placeholder="One short line of editorial copy"
                      />
                    </div>
                    <div>
                      <label className="admin-label">Secondary button text (optional)</label>
                      <input value={slide.secondaryButtonText} onChange={(e) => updateSlide(panelIdx, slideIdx, { secondaryButtonText: e.target.value })} className="admin-input mt-1" placeholder="e.g. Book a private viewing" />
                    </div>
                    <div>
                      <label className="admin-label">Secondary button link</label>
                      <input value={slide.secondaryButtonLink} onChange={(e) => updateSlide(panelIdx, slideIdx, { secondaryButtonLink: e.target.value })} className="admin-input mt-1" placeholder="https://… or /path" />
                    </div>
                    <div>
                      <label className="admin-label">Background color (behind media, optional)</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={slide.backgroundColor || '#0a0a0a'} onChange={(e) => updateSlide(panelIdx, slideIdx, { backgroundColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                        <input value={slide.backgroundColor} onChange={(e) => updateSlide(panelIdx, slideIdx, { backgroundColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" placeholder="#0a0a0a (default)" />
                      </div>
                    </div>
                    <div>
                      <label className="admin-label">Animation type</label>
                      <select value={slide.animationType} onChange={(e) => updateSlide(panelIdx, slideIdx, { animationType: e.target.value as SlideForm['animationType'] })} className="admin-input mt-1">
                        <option value="zoom">Zoom (crossfade + subtle zoom)</option>
                        <option value="fade">Fade (crossfade only)</option>
                        <option value="slide">Slide (horizontal drift)</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Alt text</label>
                      <input value={slide.altText} onChange={(e) => updateSlide(panelIdx, slideIdx, { altText: e.target.value })} className="admin-input mt-1" />
                    </div>
                    <div>
                      <label className="admin-label">Schedule Start (optional)</label>
                      <input type="datetime-local" value={slide.scheduledStart} onChange={(e) => updateSlide(panelIdx, slideIdx, { scheduledStart: e.target.value })} className="admin-input mt-1" />
                    </div>
                    <div>
                      <label className="admin-label">Schedule End (optional)</label>
                      <input type="datetime-local" value={slide.scheduledEnd} onChange={(e) => updateSlide(panelIdx, slideIdx, { scheduledEnd: e.target.value })} className="admin-input mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => addSlide(panelIdx)} className="admin-btn-secondary text-sm px-3 py-2 flex items-center">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Slide
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addPanel}
        disabled={form.panels.length >= MAX_PANELS}
        className="admin-btn-secondary px-4 py-3 w-full flex items-center justify-center disabled:opacity-40"
      >
        <Plus className="w-4 h-4 mr-2" />
        {form.panels.length >= MAX_PANELS ? `Maximum ${MAX_PANELS} panels reached` : 'Add Panel'}
      </button>
    </div>
  );
}
