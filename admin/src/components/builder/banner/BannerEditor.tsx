import { useEffect, useState } from 'react';
import { Copy, GripVertical, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import Modal from '../../ui/Modal';
import FormSection from '../../ui/FormSection';
import ConfirmDialog from '../../ui/ConfirmDialog';
import MediaPicker from '../../media/MediaPicker';
import Badge from '../../ui/Badge';
import type { BannerDraft } from '../types';
import { nextLocalId } from '../hero/HeroSetModal';

function toLocalDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function bannerFromApi(data: any): BannerDraft {
  return {
    _id: data._id,
    localId: nextLocalId(),
    name: data.name ?? '',
    isActive: data.isActive ?? true,
    scope: data.scope === 'selected' ? 'selected' : 'all',
    categorySlugs: Array.isArray(data.categorySlugs) ? data.categorySlugs : [],
    desktopImage: data.desktopImage ?? '',
    tabletImage: data.tabletImage ?? '',
    mobileImage: data.mobileImage ?? '',
    redirectUrl: data.redirectUrl ?? '',
    openInNewTab: data.openInNewTab ?? false,
    startDate: toLocalDate(data.startDate ? String(data.startDate) : undefined),
    endDate: toLocalDate(data.endDate ? String(data.endDate) : undefined),
    backgroundColor: data.backgroundColor ?? '#000000',
    borderColor: data.borderColor ?? '#c9a227',
    borderWidth: Number(data.borderWidth ?? 0),
    borderRadius: Number(data.borderRadius ?? 0),
    padding: Number(data.padding ?? 16),
    marginTop: Number(data.marginTop ?? 0),
    marginBottom: Number(data.marginBottom ?? 0),
    overlayColor: data.overlayColor ?? '#000000',
    overlayOpacity: Number(data.overlayOpacity ?? 0),
    bannerOrder: Number(data.bannerOrder ?? 0),
  };
}

export function emptyBanner(): BannerDraft {
  return {
    localId: nextLocalId(),
    name: '',
    isActive: true,
    scope: 'all',
    categorySlugs: [],
    desktopImage: '',
    tabletImage: '',
    mobileImage: '',
    redirectUrl: '',
    openInNewTab: false,
    startDate: '',
    endDate: '',
    backgroundColor: '#000000',
    borderColor: '#c9a227',
    borderWidth: 0,
    borderRadius: 0,
    padding: 16,
    marginTop: 0,
    marginBottom: 0,
    overlayColor: '#000000',
    overlayOpacity: 0,
    bannerOrder: 0,
  };
}

export function bannerToPayload(banner: BannerDraft): Record<string, any> {
  return {
    name: banner.name.trim(),
    isActive: banner.isActive,
    scope: banner.scope,
    categorySlugs: banner.categorySlugs,
    desktopImage: banner.desktopImage,
    tabletImage: banner.tabletImage,
    mobileImage: banner.mobileImage,
    redirectUrl: banner.redirectUrl,
    openInNewTab: banner.openInNewTab,
    startDate: banner.startDate ? new Date(banner.startDate).toISOString() : undefined,
    endDate: banner.endDate ? new Date(banner.endDate).toISOString() : undefined,
    bannerOrder: Number(banner.bannerOrder),
    backgroundColor: banner.backgroundColor,
    borderColor: banner.borderColor,
    borderWidth: Number(banner.borderWidth),
    borderRadius: Number(banner.borderRadius),
    padding: Number(banner.padding),
    marginTop: Number(banner.marginTop),
    marginBottom: Number(banner.marginBottom),
    overlayColor: banner.overlayColor,
    overlayOpacity: Number(banner.overlayOpacity),
  };
}

interface BannerModalProps {
  open: boolean;
  initial: BannerDraft;
  onSave: (banner: BannerDraft) => void;
  onClose: () => void;
}

function BannerModal({ open, initial, onSave, onClose }: BannerModalProps) {
  const [form, setForm] = useState<BannerDraft>(initial);
  const [categories, setCategories] = useState<{ _id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    api
      .get('/categories')
      .then((r) => setCategories((r.data.data || []).map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug }))))
      .catch(() => undefined);
  }, [open]);

  const update = (patch: Partial<BannerDraft>) => setForm((f) => ({ ...f, ...patch }));
  const toggleCategory = (slug: string) =>
    setForm((f) => ({
      ...f,
      categorySlugs: f.categorySlugs.includes(slug) ? f.categorySlugs.filter((s) => s !== slug) : [...f.categorySlugs, slug],
    }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Campaign Banner"
      wide
      footer={
        <>
          <button onClick={onClose} className="admin-btn-secondary px-4 py-2">Cancel</button>
          <button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error('Banner name is required');
                return;
              }
              onSave(form);
              onClose();
            }}
            className="admin-btn-primary px-4 py-2"
          >
            Save Banner
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormSection number={1} title="Campaign Details" description="What this banner is and where it shows.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="admin-field">
              <label className="admin-label">Banner Name</label>
              <input value={form.name} onChange={(e) => update({ name: e.target.value })} className="admin-input" placeholder="e.g. Mid-Season Sale" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Display Order (lowest first)</label>
              <input type="number" value={form.bannerOrder} onChange={(e) => update({ bannerOrder: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Status</label>
              <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => update({ isActive: e.target.value === 'active' })} className="admin-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Targeting</label>
              <select value={form.scope} onChange={(e) => update({ scope: e.target.value as 'all' | 'selected' })} className="admin-input">
                <option value="all">All pages</option>
                <option value="selected">Selected categories only</option>
              </select>
            </div>
            {form.scope === 'selected' ? (
              <div className="admin-field md:col-span-2">
                <label className="admin-label">Show on categories</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {categories.map((c) => (
                    <label key={c._id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                      form.categorySlugs.includes(c.slug)
                        ? 'border-slate-900 dark:border-slate-50 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.categorySlugs.includes(c.slug)}
                        onChange={() => toggleCategory(c.slug)}
                        className="hidden"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="admin-field">
              <label className="admin-label">Link (optional)</label>
              <input value={form.redirectUrl} onChange={(e) => update({ redirectUrl: e.target.value })} className="admin-input" placeholder="https://… or /path" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" checked={form.openInNewTab} onChange={(e) => update({ openInNewTab: e.target.checked })} className="w-4 h-4" />
                <span className="admin-label">Open in new tab</span>
              </label>
            </div>
            <div className="admin-field">
              <label className="admin-label">Start date</label>
              <input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">End date</label>
              <input type="date" value={form.endDate} onChange={(e) => update({ endDate: e.target.value })} className="admin-input" />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Artwork" description="Responsive artwork for the banner strip.">
          <div className="grid grid-cols-1 min-[1024px]:grid-cols-2 min-[1400px]:grid-cols-3 gap-6">
            <div className="min-w-0 overflow-hidden h-full flex flex-col">
              <MediaPicker
                label="Desktop Image"
                value={form.desktopImage}
                onChange={(url) => update({ desktopImage: url })}
                ratio="campaign"
                folder="campaign"
                accept="image/*"
                placeholder="https://… or upload"
              />
            </div>
            <div className="min-w-0 overflow-hidden h-full flex flex-col">
              <MediaPicker
                label="Tablet Image"
                value={form.tabletImage}
                onChange={(url) => update({ tabletImage: url })}
                ratio="campaign"
                folder="campaign"
                accept="image/*"
                placeholder="https://… or upload"
              />
            </div>
            <div className="min-w-0 overflow-hidden h-full flex flex-col">
              <MediaPicker
                label="Mobile Image"
                value={form.mobileImage}
                onChange={(url) => update({ mobileImage: url })}
                ratio="campaign"
                folder="campaign"
                accept="image/*"
                placeholder="https://… or upload"
              />
            </div>
          </div>
        </FormSection>

        <FormSection number={3} title="Styling" description="Presentation of the banner strip.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="admin-field">
              <label className="admin-label">Background color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                <input value={form.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">Border color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.borderColor} onChange={(e) => update({ borderColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                <input value={form.borderColor} onChange={(e) => update({ borderColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">Border width (px)</label>
              <input type="number" min="0" value={form.borderWidth} onChange={(e) => update({ borderWidth: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Border radius (px)</label>
              <input type="number" min="0" value={form.borderRadius} onChange={(e) => update({ borderRadius: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Padding (px)</label>
              <input type="number" min="0" value={form.padding} onChange={(e) => update({ padding: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Overlay color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.overlayColor} onChange={(e) => update({ overlayColor: e.target.value })} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
                <input value={form.overlayColor} onChange={(e) => update({ overlayColor: e.target.value })} className="admin-input flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">Overlay opacity (%)</label>
              <input type="number" min="0" max="100" value={form.overlayOpacity} onChange={(e) => update({ overlayOpacity: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Margin top (px)</label>
              <input type="number" value={form.marginTop} onChange={(e) => update({ marginTop: Number(e.target.value) })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Margin bottom (px)</label>
              <input type="number" value={form.marginBottom} onChange={(e) => update({ marginBottom: Number(e.target.value) })} className="admin-input" />
            </div>
          </div>
        </FormSection>
      </div>
    </Modal>
  );
}

interface BannerEditorProps {
  banners: BannerDraft[];
  onChange: (banners: BannerDraft[]) => void;
}

/** The campaign banner section's inspector content: manage banners. */
export default function BannerEditor({ banners, onChange }: BannerEditorProps) {
  const [editing, setEditing] = useState<BannerDraft | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [drag, setDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });

  const upsert = (draft: BannerDraft) => {
    const next = draft._id
      ? banners.map((b) => (b._id === draft._id ? draft : b))
      : [...banners, draft];
    onChange(next.map((b, i) => ({ ...b, bannerOrder: i })));
  };

  const remove = (localId: string) => {
    onChange(banners.filter((b) => b.localId !== localId));
    toast.success('Banner removed — saved when you save the page');
  };

  const duplicate = (banner: BannerDraft) => {
    const copy: BannerDraft = { ...JSON.parse(JSON.stringify(banner)), _id: undefined, localId: nextLocalId(), name: `${banner.name} (Copy)` };
    onChange([...banners, copy].map((b, i) => ({ ...b, bannerOrder: i })));
    toast.success('Banner duplicated — saved with the page');
  };

  const reorder = () => {
    const { from, over } = drag;
    if (from === null || over === null || from === over) {
      setDrag({ from: null, over: null });
      return;
    }
    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(over, 0, moved);
    onChange(next.map((b, i) => ({ ...b, bannerOrder: i })));
    setDrag({ from: null, over: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Campaign Banners</h4>
          <span className="admin-badge-slate text-[11px] px-2 py-0.5">{banners.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setConfirmAdd(true)}
          className="admin-btn-secondary px-3 py-1.5 text-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Banner
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Banners are persisted independently but managed here — the storefront renders them by order and targeting. Drag to reorder.
      </p>

      {banners.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No campaign banners yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add a banner to start your campaign</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((banner, index) => (
            <div
              key={banner.localId}
              draggable
              onDragStart={() => setDrag({ from: index, over: index })}
              onDragOver={(e) => {
                e.preventDefault();
                if (drag.from !== index) setDrag((d) => ({ ...d, over: index }));
              }}
              onDrop={reorder}
              onDragEnd={() => setDrag({ from: null, over: null })}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border bg-white dark:bg-slate-900 ${
                drag.over === index && drag.from !== null && drag.from !== index ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-200 dark:border-slate-700'
              } ${drag.from === index ? 'opacity-60' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{banner.name || 'Untitled banner'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {banner.scope === 'all' ? 'All pages' : `${banner.categorySlugs.length} categories`}
                  {banner.startDate ? ` · ${banner.startDate}` : ''}{banner.endDate ? ` → ${banner.endDate}` : ''}
                </p>
              </div>
              {banner.isActive ? <Badge tone="green">active</Badge> : <Badge tone="slate">inactive</Badge>}
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => setEditing(banner)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Edit banner">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => duplicate(banner)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Duplicate banner">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setConfirmRemoveId(banner.localId)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete banner">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerModal
        open={editing !== null}
        initial={editing ?? emptyBanner()}
        onSave={(draft) => {
          upsert(draft);
          toast.success(editing?._id ? 'Banner updated (saved with page)' : 'Banner created (saved with page)');
        }}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={confirmAdd}
        title="Add a campaign banner"
        body="Add a new banner to this page's campaign strip?"
        confirmLabel="Add Banner"
        onConfirm={() => {
          setEditing(emptyBanner());
          setConfirmAdd(false);
        }}
        onCancel={() => setConfirmAdd(false)}
      />

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove banner"
        body="This removes the banner from this page. It is saved when you click Save Page."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (confirmRemoveId !== null) remove(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}