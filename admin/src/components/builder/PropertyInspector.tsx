import { Info, Trash2, ChevronUp, ChevronDown, Zap, Package, FolderTree, Grid2x2, BookOpen, Quote, HelpCircle, Megaphone, Menu, PanelBottom } from 'lucide-react';
import type { BuilderSection, BuilderLiveData, BannerDraft, HeroSetDraft } from './types';
import { metaFor } from './sectionTypes';
import HomepageMediaCard from './HomepageMediaCard';
import HeroSetEditor from './hero/HeroSetEditor';
import BannerEditor from './banner/BannerEditor';
import MediaPicker from '../media/MediaPicker';
import MediaGallery from '../media/MediaGallery';

interface PropertyInspectorProps {
  section: BuilderSection;
  index: number;
  total: number;
  heroSets: HeroSetDraft[];
  banners: BannerDraft[];
  liveData: BuilderLiveData;
  onHeroSetsChange: (sets: HeroSetDraft[]) => void;
  onBannersChange: (banners: BannerDraft[]) => void;
  onUpdateProps: (id: string, key: string, value: any) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
}

const labelCls = 'text-[13px] font-medium text-slate-700 dark:text-slate-300';
const inputCls = 'admin-input mt-1';
const hintCls = 'text-xs text-slate-400 dark:text-slate-500 mt-1';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint ? <p className={hintCls}>{hint}</p> : null}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
    </label>
  );
}

function ColorRow({ value, onChange, placeholder = '#000000' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <input type="color" value={value || placeholder} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded border border-slate-300 dark:border-slate-600 cursor-pointer" />
      <input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input flex-1 font-mono text-xs" placeholder={placeholder} />
    </div>
  );
}

function LiveDataRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
      <span className="w-7 h-7 shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

/** The one property inspector — every section type on every page configures here. */
export default function PropertyInspector({
  section,
  index,
  total,
  heroSets,
  banners,
  liveData,
  onHeroSetsChange,
  onBannersChange,
  onUpdateProps,
  onMove,
  onRemove,
}: PropertyInspectorProps) {
  const meta = metaFor(section.type);
  const props = section.props;
  const set = (key: string, value: any) => onUpdateProps(section.id, key, value);
  const isLive = section.live || meta?.live || false;
  const isLayout = section.layout || meta?.layout || false;

  const galleryImages = (props.images ?? []).map((img: any) => ({ url: img?.image || img?.url || '', alt: img?.alt || '' }));

  const liveBadge = (() => {
    if (!meta?.liveLabel) return null;
    const counts: Record<string, number> = {
      '{count} product(s) live': liveData.products,
      '{count} collections live': liveData.collections,
      '{count} categories live': liveData.categories,
      '{count} posts live': liveData.blogs,
      '{count} reviews live': liveData.reviews,
      '{count} FAQs live': liveData.faqs,
      '{count} nav link(s)': liveData.navbarItems,
      '{count} footer link(s)': liveData.footerLinks,
      '{count} message(s) live': liveData.announcements.length,
    };
    for (const [key, value] of Object.entries(counts)) {
      if (meta.liveLabel.includes(key)) return meta.liveLabel.replace(key, String(value));
    }
    return meta.liveLabel;
  })();

  return (
    <div className="admin-card p-6">
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Section Properties</h3>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 max-w-xl">
            {section.label ?? meta?.label ?? section.type} · Section {index + 1} of {total}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => onMove(index, 'up')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30" aria-label="Move section up">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onMove(index, 'down')} disabled={index === total - 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30" aria-label="Move section down">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onRemove(section.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" aria-label="Remove section">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Live storefront data — this section mirrors a real storefront section */}
      {isLive && (
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-4">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[13px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              {isLayout
                ? 'This is a storefront layout section — it renders on every page and is configured from its dedicated editor.'
                : 'This section renders live storefront data — no manual configuration needed. It reflects exactly what shoppers see.'}
              {liveBadge ? <span className="mt-1 block font-medium">{liveBadge}</span> : null}
            </div>
          </div>
          {!isLayout && (
            <div className="grid grid-cols-2 gap-2">
              <LiveDataRow icon={Package} label="Products" value={liveData.products} />
              <LiveDataRow icon={Grid2x2} label="Collections" value={liveData.collections} />
              <LiveDataRow icon={FolderTree} label="Categories" value={liveData.categories} />
              <LiveDataRow icon={BookOpen} label="Journal posts" value={liveData.blogs} />
              <LiveDataRow icon={Quote} label="Reviews" value={liveData.reviews} />
              <LiveDataRow icon={HelpCircle} label="FAQs" value={liveData.faqs} />
            </div>
          )}
          {isLayout && (
            <div className="grid grid-cols-2 gap-2">
              <LiveDataRow icon={Megaphone} label="Announcements" value={liveData.announcements.length} />
              <LiveDataRow icon={Menu} label="Nav links" value={liveData.navbarItems} />
              <LiveDataRow icon={PanelBottom} label="Footer links" value={liveData.footerLinks} />
            </div>
          )}
        </div>
      )}

      {meta?.entity === 'hero' ? (
        <HeroSetEditor sets={heroSets} onChange={onHeroSetsChange} />
      ) : meta?.entity === 'banner' ? (
        <BannerEditor banners={banners} onChange={onBannersChange} />
      ) : (
        <div className="space-y-6">
          {!isLive && meta && !meta.configurable && (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                This section renders live store data automatically — no configuration needed.
                Add it to control where it appears.
              </p>
            </div>
          )}

          {/* editorial (homepage + pages) */}
          {section.type === 'editorial' && (
            <>
              <HomepageMediaCard label="Editorial Image" value={props.image || ''} onChange={(url) => set('image', url)} ratio="editorial" folder="editorial" />
              <Field label="Eyebrow">
                <input type="text" value={props.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} placeholder="The Atelier Edit" />
              </Field>
              <Field label="Title" hint={!props.title ? 'The editorial banner only renders once a title is set.' : undefined}>
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Crafted, not mass-produced" />
              </Field>
              <Field label="Description">
                <textarea rows={3} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[84px] resize-y py-3 leading-relaxed`} placeholder="Every piece is considered…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary CTA label">
                  <input type="text" value={props.primaryCta?.label || ''} onChange={(e) => onUpdateProps(section.id, 'primaryCta', { ...(props.primaryCta ?? {}), label: e.target.value })} className={inputCls} placeholder="Our story" />
                </Field>
                <Field label="Primary CTA URL">
                  <input type="text" value={props.primaryCta?.url || ''} onChange={(e) => onUpdateProps(section.id, 'primaryCta', { ...(props.primaryCta ?? {}), url: e.target.value })} className={inputCls} placeholder="/about" />
                </Field>
                <Field label="Secondary CTA label">
                  <input type="text" value={props.secondaryCta?.label || ''} onChange={(e) => onUpdateProps(section.id, 'secondaryCta', { ...(props.secondaryCta ?? {}), label: e.target.value })} className={inputCls} placeholder="Read the journal" />
                </Field>
                <Field label="Secondary CTA URL">
                  <input type="text" value={props.secondaryCta?.url || ''} onChange={(e) => onUpdateProps(section.id, 'secondaryCta', { ...(props.secondaryCta ?? {}), url: e.target.value })} className={inputCls} placeholder="/journal" />
                </Field>
              </div>
            </>
          )}

          {/* instagram (homepage + pages) */}
          {section.type === 'instagram' && (
            <>
              <Field label="Eyebrow">
                <input type="text" value={props.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} placeholder="@bristi" />
              </Field>
              <Field label="Title">
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="The Instagram" />
              </Field>
              <Field label="Description">
                <textarea rows={2} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[70px] resize-y py-3 leading-relaxed`} placeholder="A look inside the maison" />
              </Field>
              <Field label="Profile URL">
                <input type="url" value={props.url || ''} onChange={(e) => set('url', e.target.value)} className={inputCls} placeholder="https://instagram.com/bristi" />
              </Field>
              <Field label="Instagram tiles">
                <MediaGallery
                  images={galleryImages}
                  onChange={(next) => set('images', next.map((g) => ({ image: g.url, alt: g.alt || '' })))}
                  ratio="instagram"
                  folder="social"
                  max={6}
                />
              </Field>
            </>
          )}

          {/* newsletter (homepage + pages) */}
          {section.type === 'newsletter' && (
            <>
              <Field label="Eyebrow">
                <input type="text" value={props.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} placeholder="Private list" />
              </Field>
              <Field label="Title" hint={!props.title ? 'The newsletter section only renders once a title is set.' : undefined}>
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="First access. Private previews." />
              </Field>
              <Field label="Description">
                <textarea rows={3} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[84px] resize-y py-3 leading-relaxed`} placeholder="Join the list for early access…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Input placeholder">
                  <input type="text" value={props.placeholder || ''} onChange={(e) => set('placeholder', e.target.value)} className={inputCls} placeholder="Your email address" />
                </Field>
                <Field label="Button text">
                  <input type="text" value={props.buttonText || ''} onChange={(e) => set('buttonText', e.target.value)} className={inputCls} placeholder="Subscribe" />
                </Field>
              </div>
              <Field label="Footer text">
                <input type="text" value={props.footerText || ''} onChange={(e) => set('footerText', e.target.value)} className={inputCls} placeholder="Unsubscribe at any time. No noise, only elegance." />
              </Field>
            </>
          )}

          {/* text */}
          {section.type === 'text' && (
            <>
              <Field label="Heading">
                <input type="text" value={props.heading || ''} onChange={(e) => set('heading', e.target.value)} className={inputCls} placeholder="Page heading" />
              </Field>
              <Field label="Subheading">
                <input type="text" value={props.subheading || ''} onChange={(e) => set('subheading', e.target.value)} className={inputCls} placeholder="Optional subheading" />
              </Field>
              <Field label="Body">
                <textarea rows={6} value={props.body || ''} onChange={(e) => set('body', e.target.value)} className={`${inputCls} min-h-[120px] resize-y py-3 leading-relaxed`} placeholder="Write the page content…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Text alignment">
                  <select value={props.align || 'left'} onChange={(e) => set('align', e.target.value)} className={inputCls}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
                <Field label="Text color">
                  <ColorRow value={props.textColor || ''} onChange={(v) => set('textColor', v)} placeholder="#0a0a0a" />
                </Field>
              </div>
            </>
          )}

          {/* product-grid */}
          {section.type === 'product-grid' && (
            <>
              <Field label="Title">
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Curated for you" />
              </Field>
              <Field label="Subtitle">
                <input type="text" value={props.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} className={inputCls} placeholder="Optional subtitle" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Product source">
                  <select value={props.source || 'featured'} onChange={(e) => set('source', e.target.value)} className={inputCls}>
                    <option value="featured">Featured</option>
                    <option value="new-arrivals">New arrivals</option>
                    <option value="best-sellers">Best sellers</option>
                    <option value="trending">Trending</option>
                  </select>
                </Field>
                <Field label="Limit">
                  <input type="number" min="1" max="24" value={props.limit ?? 4} onChange={(e) => set('limit', Number(e.target.value))} className={inputCls} />
                </Field>
              </div>
              <Field label="Columns">
                <select value={props.columns ?? 4} onChange={(e) => set('columns', Number(e.target.value))} className={inputCls}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </Field>
            </>
          )}

          {/* banner / image banner */}
          {section.type === 'banner' && (
            <>
              <MediaPicker label="Banner Image" value={props.image || ''} onChange={(url) => set('image', url)} ratio="campaign" folder="campaigns" />
              <MediaPicker label="Mobile Image (optional)" value={props.imageMobile || ''} onChange={(url) => set('imageMobile', url)} ratio="campaignMobile" folder="campaigns" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Link URL">
                  <input type="text" value={props.linkUrl || ''} onChange={(e) => set('linkUrl', e.target.value)} className={inputCls} placeholder="https://… or /path" />
                </Field>
                <Field label="Link text">
                  <input type="text" value={props.linkText || ''} onChange={(e) => set('linkText', e.target.value)} className={inputCls} placeholder="Shop now" />
                </Field>
              </div>
              <Field label="Overlay opacity (%)">
                <input type="number" min="0" max="100" value={props.overlayOpacity ?? 0} onChange={(e) => set('overlayOpacity', Number(e.target.value))} className={inputCls} />
              </Field>
            </>
          )}

          {/* split-banner */}
          {section.type === 'split-banner' && (
            <>
              <MediaPicker label="Image" value={props.image || ''} onChange={(url) => set('image', url)} ratio="editorial" folder="editorial" />
              <Field label="Eyebrow">
                <input type="text" value={props.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} placeholder="The Atelier" />
              </Field>
              <Field label="Title">
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Split banner heading" />
              </Field>
              <Field label="Description">
                <textarea rows={3} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[84px] resize-y py-3 leading-relaxed`} placeholder="Copy for the second column…" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="CTA label">
                  <input type="text" value={props.cta?.label || ''} onChange={(e) => onUpdateProps(section.id, 'cta', { ...(props.cta ?? {}), label: e.target.value })} className={inputCls} placeholder="Learn more" />
                </Field>
                <Field label="CTA URL">
                  <input type="text" value={props.cta?.url || ''} onChange={(e) => onUpdateProps(section.id, 'cta', { ...(props.cta ?? {}), url: e.target.value })} className={inputCls} placeholder="/about" />
                </Field>
              </div>
              <CheckRow label="Flip layout (image on the right)" checked={props.flip ?? false} onChange={(v) => set('flip', v)} />
            </>
          )}

          {/* video */}
          {section.type === 'video' && (
            <>
              <MediaPicker label="Video" value={props.video || ''} onChange={(url) => set('video', url)} folder="videos" accept="video/mp4,video/webm" allowCrop={false} />
              <MediaPicker label="Poster image (optional)" value={props.poster || ''} onChange={(url) => set('poster', url)} ratio="video" folder="videos" />
              <div className="grid grid-cols-2 gap-3">
                <CheckRow label="Autoplay" checked={props.autoplay ?? false} onChange={(v) => set('autoplay', v)} />
                <CheckRow label="Muted" checked={props.muted ?? true} onChange={(v) => set('muted', v)} />
                <CheckRow label="Loop" checked={props.loop ?? false} onChange={(v) => set('loop', v)} />
                <CheckRow label="Show controls" checked={props.controls ?? true} onChange={(v) => set('controls', v)} />
              </div>
            </>
          )}

          {/* video-banner */}
          {section.type === 'video-banner' && (
            <>
              <MediaPicker label="Video" value={props.video || ''} onChange={(url) => set('video', url)} folder="videos" accept="video/mp4,video/webm" allowCrop={false} />
              <MediaPicker label="Poster image (optional)" value={props.poster || ''} onChange={(url) => set('poster', url)} ratio="video" folder="videos" />
              <Field label="Title">
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Video banner heading" />
              </Field>
              <Field label="Description">
                <textarea rows={2} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[70px] resize-y py-3 leading-relaxed`} placeholder="Overlay copy…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <CheckRow label="Autoplay" checked={props.autoplay ?? true} onChange={(v) => set('autoplay', v)} />
                <CheckRow label="Muted" checked={props.muted ?? true} onChange={(v) => set('muted', v)} />
              </div>
            </>
          )}

          {/* image-gallery */}
          {section.type === 'image-gallery' && (
            <Field label="Gallery Images">
              <MediaGallery
                images={galleryImages}
                onChange={(next) => set('images', next.map((g) => ({ image: g.url, alt: g.alt || '' })))}
                ratio="instagram"
                folder="social"
                max={12}
              />
            </Field>
          )}

          {/* testimonials */}
          {section.type === 'testimonials' && (
            <>
              <Field label="Heading">
                <input type="text" value={props.heading || ''} onChange={(e) => set('heading', e.target.value)} className={inputCls} placeholder="What our clients say" />
              </Field>
              <Field label="Testimonials">
                <div className="space-y-3 mt-2">
                  {(props.items ?? []).map((item: any, idx: number) => (
                    <div key={idx} className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => set('items', (props.items ?? []).filter((_: any, i: number) => i !== idx))}
                          className="ml-auto text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <input type="text" value={item.quote || ''} onChange={(e) => set('items', (props.items ?? []).map((t: any, i: number) => (i === idx ? { ...t, quote: e.target.value } : t)))} className={inputCls} placeholder="Quote" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={item.author || ''} onChange={(e) => set('items', (props.items ?? []).map((t: any, i: number) => (i === idx ? { ...t, author: e.target.value } : t)))} className={inputCls} placeholder="Author" />
                        <input type="text" value={item.role || ''} onChange={(e) => set('items', (props.items ?? []).map((t: any, i: number) => (i === idx ? { ...t, role: e.target.value } : t)))} className={inputCls} placeholder="Role" />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('items', [...(props.items ?? []), { quote: '', author: '', role: '' }])}
                    className="admin-btn-secondary w-full py-2 text-sm"
                  >
                    + Add testimonial
                  </button>
                </div>
              </Field>
            </>
          )}

          {/* brand-story */}
          {section.type === 'brand-story' && (
            <>
              <HomepageMediaCard label="Story Image" value={props.image || ''} onChange={(url) => set('image', url)} ratio="editorial" folder="about" />
              <Field label="Eyebrow">
                <input type="text" value={props.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} placeholder="The maison" />
              </Field>
              <Field label="Title">
                <input type="text" value={props.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Our story" />
              </Field>
              <Field label="Description">
                <textarea rows={4} value={props.description || ''} onChange={(e) => set('description', e.target.value)} className={`${inputCls} min-h-[110px] resize-y py-3 leading-relaxed`} placeholder="The brand narrative…" />
              </Field>
              <Field label="Values">
                <div className="space-y-3 mt-2">
                  {(props.values ?? []).map((item: any, idx: number) => (
                    <div key={idx} className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => set('values', (props.values ?? []).filter((_: any, i: number) => i !== idx))}
                          className="ml-auto text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <input type="text" value={item.title || ''} onChange={(e) => set('values', (props.values ?? []).map((t: any, i: number) => (i === idx ? { ...t, title: e.target.value } : t)))} className={inputCls} placeholder="Value title" />
                      <input type="text" value={item.description || ''} onChange={(e) => set('values', (props.values ?? []).map((t: any, i: number) => (i === idx ? { ...t, description: e.target.value } : t)))} className={inputCls} placeholder="Value description" />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('values', [...(props.values ?? []), { title: '', description: '' }])}
                    className="admin-btn-secondary w-full py-2 text-sm"
                  >
                    + Add value
                  </button>
                </div>
              </Field>
            </>
          )}

          {/* seo */}
          {section.type === 'seo' && (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Meta title, description and keywords are saved with the page and drive search results for this page.
                </p>
              </div>
              <Field label="Meta title">
                <input type="text" value={props.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} className={inputCls} placeholder="About — BRISTI" />
              </Field>
              <Field label="Meta description">
                <textarea rows={3} value={props.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} className={`${inputCls} min-h-[84px] resize-y py-3 leading-relaxed`} placeholder="Describe this page for search engines…" />
              </Field>
              <Field label="Keywords (comma separated)">
                <input type="text" value={props.seoKeywords || ''} onChange={(e) => set('seoKeywords', e.target.value)} className={inputCls} placeholder="luxury, tailoring, boutique" />
              </Field>
            </>
          )}

          {/* custom */}
          {section.type === 'custom' && (
            <Field label="HTML">
              <textarea rows={8} value={props.html || ''} onChange={(e) => set('html', e.target.value)} className={`${inputCls} font-mono text-sm min-h-[160px] resize-y py-3 leading-relaxed`} placeholder="<div>…</div>" />
            </Field>
          )}

          {/* universal presentation (all configurable page sections) */}
          {!isLive && section.type !== 'hero' && section.type !== 'campaign-banner' && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Design & Layout</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Background color">
                  <ColorRow value={props.backgroundColor || ''} onChange={(v) => set('backgroundColor', v)} placeholder="#ffffff" />
                </Field>
                <Field label="Overlay color">
                  <ColorRow value={props.overlayColor || ''} onChange={(v) => set('overlayColor', v)} placeholder="#000000" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Overlay opacity (%)">
                  <input type="number" min="0" max="100" value={props.overlayOpacity ?? 0} onChange={(e) => set('overlayOpacity', Number(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Border radius (px)">
                  <input type="number" min="0" value={props.borderRadius ?? 0} onChange={(e) => set('borderRadius', Number(e.target.value))} className={inputCls} />
                </Field>
              </div>
              <Field label="Padding" hint="CSS shorthand, e.g. 40px 20px">
                <input type="text" value={props.padding || ''} onChange={(e) => set('padding', e.target.value)} className={inputCls} placeholder="40px 20px" />
              </Field>
              <Field label="Margin" hint="CSS shorthand, e.g. 0 0 32px">
                <input type="text" value={props.margin || ''} onChange={(e) => set('margin', e.target.value)} className={inputCls} placeholder="0 0 32px" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Animation">
                  <select value={props.animation || 'none'} onChange={(e) => set('animation', e.target.value)} className={inputCls}>
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </Field>
                <Field label="Animation speed (ms)">
                  <input type="number" min="0" value={props.animationSpeed ?? 600} onChange={(e) => set('animationSpeed', Number(e.target.value))} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CheckRow label="Desktop" checked={props.visibleDesktop ?? true} onChange={(v) => set('visibleDesktop', v)} />
                <CheckRow label="Tablet" checked={props.visibleTablet ?? true} onChange={(v) => set('visibleTablet', v)} />
                <CheckRow label="Mobile" checked={props.visibleMobile ?? true} onChange={(v) => set('visibleMobile', v)} />
              </div>
              <Field label="Custom CSS" hint="Scoped styles for this section">
                <textarea rows={4} value={props.customCss || ''} onChange={(e) => set('customCss', e.target.value)} className={`${inputCls} font-mono text-sm`} placeholder=".section { }" />
              </Field>
            </div>
          )}

          {!isLive && (
            <button
              type="button"
              onClick={() => onRemove(section.id)}
              className="admin-btn-ghost !h-11 w-full !rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 flex items-center justify-center gap-2 text-[13px]"
            >
              <Trash2 className="w-4 h-4" />
              Remove section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
