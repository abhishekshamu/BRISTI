import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Eye, Monitor, Tablet, Smartphone } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { HeroBlock } from '../../types/index';

interface HeroFormValues {
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  video?: string;
  imageMobile?: string;
  videoMobile?: string;
  badge?: string;
  primaryLabel: string;
  primaryLinkType: 'collection' | 'category' | 'product' | 'custom';
  primaryLink: string;
  secondaryLabel: string;
  secondaryLinkType: 'collection' | 'category' | 'product' | 'custom';
  secondaryLink: string;
  overlay: boolean;
  overlayOpacity: number;
  gradient: boolean;
  contentAlignment: 'left' | 'center' | 'right';
  textColor: string;
  buttonColor: string;
  accentColor: string;
  animationStyle: 'slide' | 'fade' | 'kenburns';
  animationSpeed: number;
  visibilityDesktop: boolean;
  visibilityTablet: boolean;
  visibilityMobile: boolean;
  priority: number;
  seoLabel: string;
  altText: string;
  status: 'draft' | 'published';
  isActive: boolean;
  scheduledStart: string;
  scheduledEnd: string;
}

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

export default function HeroEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [options, setOptions] = useState<{ collections: { _id: string; name: string; slug: string }[]; categories: { _id: string; name: string; slug: string }[]; products: { _id: string; name: string; slug: string }[] }>({
    collections: [],
    categories: [],
    products: [],
  });

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<HeroFormValues>({
    defaultValues: {
      title: '',
      subtitle: '',
      description: '',
      image: '',
      video: '',
      imageMobile: '',
      videoMobile: '',
      badge: '',
      primaryLabel: '',
      primaryLinkType: 'custom',
      primaryLink: '',
      secondaryLabel: '',
      secondaryLinkType: 'custom',
      secondaryLink: '',
      overlay: true,
      overlayOpacity: 45,
      gradient: true,
      contentAlignment: 'left',
      textColor: '',
      buttonColor: '',
      accentColor: '',
      animationStyle: 'kenburns',
      animationSpeed: 1,
      visibilityDesktop: true,
      visibilityTablet: true,
      visibilityMobile: true,
      priority: 0,
      seoLabel: '',
      altText: '',
      status: 'draft',
      isActive: true,
      scheduledStart: '',
      scheduledEnd: '',
    },
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
          const b = response.data.data as HeroBlock;
          reset({
            title: b.title ?? '',
            subtitle: b.subtitle ?? '',
            description: b.description ?? '',
            image: b.image ?? '',
            video: b.video ?? '',
            imageMobile: b.imageMobile ?? '',
            videoMobile: b.videoMobile ?? '',
            badge: b.badge ?? '',
            primaryLabel: b.primaryButton?.label ?? '',
            primaryLinkType: b.primaryButton?.linkType ?? 'custom',
            primaryLink: b.primaryButton?.link ?? '',
            secondaryLabel: b.secondaryButton?.label ?? '',
            secondaryLinkType: b.secondaryButton?.linkType ?? 'custom',
            secondaryLink: b.secondaryButton?.link ?? '',
            overlay: b.overlay ?? true,
            overlayOpacity: b.overlayOpacity ?? 45,
            gradient: b.gradient ?? true,
            contentAlignment: b.contentAlignment ?? 'left',
            textColor: b.textColor ?? '',
            buttonColor: b.buttonColor ?? '',
            accentColor: b.accentColor ?? '',
            animationStyle: b.animationStyle ?? 'kenburns',
            animationSpeed: b.animationSpeed ?? 1,
            visibilityDesktop: b.visibility?.desktop ?? true,
            visibilityTablet: b.visibility?.tablet ?? true,
            visibilityMobile: b.visibility?.mobile ?? true,
            priority: b.priority ?? 0,
            seoLabel: b.seoLabel ?? '',
            altText: b.altText ?? '',
            status: b.status ?? 'draft',
            isActive: b.isActive ?? true,
            scheduledStart: toLocalInput(b.scheduledStart ? String(b.scheduledStart) : undefined),
            scheduledEnd: toLocalInput(b.scheduledEnd ? String(b.scheduledEnd) : undefined),
          });
        })
        .catch(() => {
          toast.error('Failed to fetch hero block');
          navigate('/hero');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const values = watch();
  const primaryLinkType = values.primaryLinkType;
  const secondaryLinkType = values.secondaryLinkType;

  const linkOptions = (type: string) => {
    if (type === 'collection') return options.collections;
    if (type === 'category') return options.categories;
    if (type === 'product') return options.products;
    return [];
  };

  const onSubmit = async (data: HeroFormValues) => {
    try {
      setSaving(true);
      const payload = {
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        image: data.image,
        video: data.video,
        imageMobile: data.imageMobile,
        videoMobile: data.videoMobile,
        badge: data.badge,
        primaryButton: {
          label: data.primaryLabel,
          linkType: data.primaryLinkType,
          link: data.primaryLink,
        },
        secondaryButton: {
          label: data.secondaryLabel,
          linkType: data.secondaryLinkType,
          link: data.secondaryLink,
        },
        overlay: data.overlay,
        overlayOpacity: Number(data.overlayOpacity),
        gradient: data.gradient,
        contentAlignment: data.contentAlignment,
        textColor: data.textColor,
        buttonColor: data.buttonColor,
        accentColor: data.accentColor,
        animationStyle: data.animationStyle,
        animationSpeed: Number(data.animationSpeed),
        visibility: {
          desktop: data.visibilityDesktop,
          tablet: data.visibilityTablet,
          mobile: data.visibilityMobile,
        },
        priority: Number(data.priority),
        seoLabel: data.seoLabel,
        altText: data.altText,
        status: data.status,
        isActive: data.isActive,
        scheduledStart: toIso(data.scheduledStart),
        scheduledEnd: toIso(data.scheduledEnd),
      };
      if (isEdit) {
        await api.put(`/hero/${id}`, payload);
        toast.success('Hero block updated');
      } else {
        await api.post('/hero', payload);
        toast.success('Hero block created');
      }
      navigate('/hero');
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to save hero block');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const primaryHref =
    primaryLinkType === 'collection' ? `/collection/${values.primaryLink}` :
    primaryLinkType === 'category' ? `/shop?category=${values.primaryLink}` :
    primaryLinkType === 'product' ? `/product/${values.primaryLink}` : values.primaryLink;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/hero')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isEdit ? 'Edit' : 'Add'} Hero Block</h2>
            <p className="text-slate-500 dark:text-slate-400">Every field is editable — the homepage hero reflects this instantly.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview((v) => !v)} className="admin-btn-secondary py-2.5 px-4 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>
          <button type="submit" form="hero-form" disabled={saving} className="admin-btn-primary py-2.5 px-4 flex items-center">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="admin-card overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Live preview — {values.visibilityMobile ? <Smartphone className="inline w-3.5 h-3.5" /> : 'hidden on mobile'}
            {values.visibilityTablet ? <Tablet className="inline w-3.5 h-3.5 ml-2" /> : ' hidden on tablet'}
            {values.visibilityDesktop ? <Monitor className="inline w-3.5 h-3.5 ml-2" /> : ' hidden on desktop'}
          </div>
          <div className="relative h-64 bg-black">
            {values.image ? <img src={values.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            {values.overlay ? (
              <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${Math.min(0.85, Math.max(0, Number(values.overlayOpacity) / 100))})` }} />
            ) : null}
            {values.gradient ? <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" /> : null}
            <div
              className={`absolute inset-0 flex flex-col justify-center p-8 text-white ${
                values.contentAlignment === 'center' ? 'items-center text-center' : values.contentAlignment === 'right' ? 'items-end text-right' : 'items-start'
              }`}
            >
              {values.badge ? (
                <span className="mb-3 text-[10px] uppercase tracking-lux text-amber-400">{values.badge}</span>
              ) : null}
              <h3 className="font-display text-3xl">{values.title || 'Untitled block'}</h3>
              {values.subtitle ? <p className="mt-2 text-sm opacity-80">{values.subtitle}</p> : null}
              {values.description ? <p className="mt-1 text-xs opacity-60 max-w-sm">{values.description}</p> : null}
              {primaryHref && values.primaryLabel ? (
                <span className="mt-5 inline-flex bg-amber-500 px-4 py-2 text-xs uppercase tracking-wider">{values.primaryLabel}</span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <form id="hero-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Content</h3>
          <div>
            <label className="admin-label">Title</label>
            <input {...register('title', { required: 'Title is required' })} className="admin-input mt-1" />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Subtitle</label>
              <input {...register('subtitle')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">Badge (eyebrow)</label>
              <input {...register('badge')} className="admin-input mt-1" />
            </div>
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={3} className="admin-input mt-1" />
          </div>
        </div>

        <div className="admin-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Desktop Image URL</label>
              <input {...register('image')} className="admin-input mt-1" placeholder="https://…" />
            </div>
            <div>
              <label className="admin-label">Mobile Image URL (optional, overrides desktop)</label>
              <input {...register('imageMobile')} className="admin-input mt-1" placeholder="https://…" />
            </div>
            <div>
              <label className="admin-label">Desktop Video URL (optional, overrides image)</label>
              <input {...register('video')} className="admin-input mt-1" placeholder="https://…mp4" />
            </div>
            <div>
              <label className="admin-label">Mobile Video URL (optional)</label>
              <input {...register('videoMobile')} className="admin-input mt-1" placeholder="https://…mp4" />
            </div>
            <div>
              <label className="admin-label">Alt Text</label>
              <input {...register('altText')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">SEO Label</label>
              <input {...register('seoLabel')} className="admin-input mt-1" />
            </div>
          </div>
        </div>

        <div className="admin-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Buttons &amp; Links</h3>
          {(['primaryLabel', 'primaryLinkType', 'primaryLink'] as const).map((_, i) => {
            const label = i === 0 ? 'primary' : 'secondary';
            return (
              <div key={label} className="border border-slate-100 dark:border-slate-800 rounded-md p-4 space-y-3">
                <label className="admin-label capitalize">{label} Button</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="admin-label text-xs">Label</label>
                    <input {...register(`${label}Label` as 'primaryLabel')} className="admin-input mt-1" />
                  </div>
                  <div>
                    <label className="admin-label text-xs">Links to</label>
                    <select
                      {...register(`${label}LinkType` as 'primaryLinkType')}
                      className="admin-input mt-1"
                      onChange={(e) => setValue(`${label}Link` as 'primaryLink', '')}
                    >
                      <option value="custom">Custom URL</option>
                      <option value="collection">Collection</option>
                      <option value="category">Category</option>
                      <option value="product">Product</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label text-xs">Target</label>
                    {(['custom', 'collection', 'category', 'product'] as const).includes(label === 'primary' ? primaryLinkType : secondaryLinkType) && (label === 'primary' ? primaryLinkType : secondaryLinkType) !== 'custom' ? (
                      <select
                        {...register(`${label}Link` as 'primaryLink')}
                        className="admin-input mt-1"
                        defaultValue=""
                      >
                        <option value="">Select…</option>
                        {linkOptions(label === 'primary' ? primaryLinkType : secondaryLinkType).map((o) => (
                          <option key={o._id} value={o.slug}>{o.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...register(`${label}Link` as 'primaryLink')}
                        className="admin-input mt-1"
                        placeholder="https://… or /path"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Styling</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Content Alignment</label>
              <select {...register('contentAlignment')} className="admin-input mt-1">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Animation Style</label>
              <select {...register('animationStyle')} className="admin-input mt-1">
                <option value="kenburns">Ken Burns (slow zoom)</option>
                <option value="slide">Slide (static)</option>
                <option value="fade">Fade</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Animation Speed (slide seconds, 0.3–4)</label>
              <input type="number" step="0.1" min="0.3" max="4" {...register('animationSpeed')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">Display Order (priority, lowest first)</label>
              <input type="number" {...register('priority')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">Text Color (hex or theme token, e.g. accent)</label>
              <div className="flex gap-2 mt-1">
                <input {...register('textColor')} className="admin-input" placeholder="Leave empty = theme" />
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(values.textColor || '') ? values.textColor : '#ffffff'}
                  onChange={(e) => setValue('textColor', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="admin-label">Button Color (hex or token)</label>
              <div className="flex gap-2 mt-1">
                <input {...register('buttonColor')} className="admin-input" placeholder="Empty = gold" />
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(values.buttonColor || '') ? values.buttonColor : '#c9a227'}
                  onChange={(e) => setValue('buttonColor', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="admin-label">Accent Color (hex or token)</label>
              <div className="flex gap-2 mt-1">
                <input {...register('accentColor')} className="admin-input" placeholder="Empty = theme accent" />
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(values.accentColor || '') ? values.accentColor : '#c9a227'}
                  onChange={(e) => setValue('accentColor', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('overlay')} className="w-4 h-4" />
              <span className="admin-label">Dark overlay</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('gradient')} className="w-4 h-4" />
              <span className="admin-label">Editorial gradient</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="admin-label">Overlay opacity: {values.overlayOpacity}%</span>
              <input type="range" min="0" max="85" {...register('overlayOpacity')} className="w-40 accent-amber-500" />
            </label>
          </div>
        </div>

        <div className="admin-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Publishing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Status</label>
              <select {...register('status')} className="admin-input mt-1">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
                <span className="admin-label">Active</span>
              </label>
            </div>
            <div>
              <label className="admin-label">Schedule Start (optional)</label>
              <input type="datetime-local" {...register('scheduledStart')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">Schedule End (optional)</label>
              <input type="datetime-local" {...register('scheduledEnd')} className="admin-input mt-1" />
            </div>
          </div>
          <div>
            <label className="admin-label">Visibility</label>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('visibilityDesktop')} className="w-4 h-4" />
                <Monitor className="w-4 h-4" /> Desktop
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('visibilityTablet')} className="w-4 h-4" />
                <Tablet className="w-4 h-4" /> Tablet
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('visibilityMobile')} className="w-4 h-4" />
                <Smartphone className="w-4 h-4" /> Mobile
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
