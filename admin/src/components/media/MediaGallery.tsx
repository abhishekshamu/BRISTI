import { useRef, useState } from 'react';
import { Plus, Star, Upload, Library, Link2, Trash2, GripVertical, Pencil, X, Check, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MediaFile } from '@shared/types';
import { getMediaRatio } from '@shared/constants';
import { uploadFiles } from '../../services/media.service';
import MediaLibraryDialog from './MediaLibraryDialog';

export interface GalleryImage {
  url: string;
  alt?: string;
  isFeatured?: boolean;
}

interface MediaGalleryProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  ratio?: string;
  folder?: string;
  max?: number;
  disabled?: boolean;
}

export default function MediaGallery({ images, onChange, ratio = 'product', folder = 'products', max = 12, disabled = false }: MediaGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const ratioInfo = getMediaRatio(ratio);
  const frameStyle: React.CSSProperties | undefined = ratioInfo && ratioInfo.w > 0 ? { aspectRatio: `${ratioInfo.w} / ${ratioInfo.h}` } : { aspectRatio: '3 / 4' };

  const update = (next: GalleryImage[]) => {
    const cleaned = next.map((img, index) => ({
      ...img,
      isFeatured: index === 0 ? img.isFeatured : img.isFeatured,
    }));
    // Exactly one featured: first featured wins; fallback to first image.
    const featuredIndex = cleaned.findIndex((i) => i.isFeatured);
    const normalized = cleaned.map((img, index) => ({
      ...img,
      isFeatured: index === (featuredIndex >= 0 ? featuredIndex : 0),
    }));
    onChange(normalized);
  };

  const handleUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadFiles(list, { folder });
      const next = [...images];
      for (const f of uploaded) {
        if (next.length >= max) break;
        next.push({ url: f.url, alt: f.altText || '', isFeatured: next.length === 0 });
      }
      update(next);
      toast.success(`${Math.min(uploaded.length, max - images.length + (uploaded.length > 1 ? 0 : 1))} image${uploaded.length > 1 ? 's' : ''} added`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLibraryPick = (files: MediaFile[]) => {
    const next = [...images];
    for (const f of files) {
      if (next.length >= max) break;
      next.push({ url: f.url, alt: f.altText || '', isFeatured: next.length === 0 });
    }
    update(next);
    setLibraryOpen(false);
    if (files.length > 0) toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added`);
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length >= max) {
      toast.error(`Maximum ${max} images`);
      return;
    }
    const next = [...images, { url, alt: '', isFeatured: images.length === 0 }];
    update(next);
    setUrlInput('');
    setUrlOpen(false);
  };

  const removeAt = (index: number) => {
    update(images.filter((_, i) => i !== index));
  };

  const toggleFeatured = (index: number) => {
    update(images.map((img, i) => ({ ...img, isFeatured: i === index })));
  };

  const toggleHover = (index: number) => {
    // The frontend uses images[1] as the hover image — bring it to slot 2.
    const next = [...images];
    if (index === 1) return;
    const [moved] = next.splice(index, 1);
    next.splice(1, 0, moved);
    update(next);
    toast.success('Hover image set (2nd position)');
  };

  const saveAlt = (index: number) => {
    update(images.map((img, i) => (i === index ? { ...img, alt: editAlt } : img)));
    setEditing(null);
  };

  const onDrop = (target: number) => {
    if (dragging === null || dragging === target) {
      setDragging(null);
      setOver(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragging, 1);
    next.splice(target, 0, moved);
    update(next);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, index) => (
          <div
            key={`${img.url}-${index}`}
            draggable={!disabled && editing !== index}
            onDragStart={() => setDragging(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(index);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => onDrop(index)}
            className={`group relative rounded-xl overflow-hidden border-2 bg-slate-100 dark:bg-slate-800 transition-all ${
              over === index && dragging !== null ? 'border-slate-900 dark:border-slate-100 scale-[1.02]' : 'border-slate-200 dark:border-slate-700'
            } ${editing === index ? 'ring-2 ring-slate-900 dark:ring-slate-100' : ''}`}
          >
            <div className="w-full overflow-hidden" style={frameStyle}>
              <img src={img.url} alt={img.alt || `Product image ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </div>

            {/* Badges */}
            <div className="absolute top-2 left-2 flex gap-1">
              {img.isFeatured && <span className="px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white text-[9px] font-medium uppercase tracking-wide backdrop-blur-sm">Featured</span>}
              {index === 1 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-medium uppercase tracking-wide backdrop-blur-sm">Hover</span>}
            </div>
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[9px] tabular-nums backdrop-blur-sm">{index + 1}</span>

            {/* Hover actions */}
            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button" title={img.isFeatured ? 'Featured image' : 'Set as featured'} onClick={() => toggleFeatured(index)} className={`p-1.5 rounded-md ${img.isFeatured ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white hover:bg-white/40'}`}>
                  <Star className="w-3 h-3" />
                </button>
                {index !== 1 && index !== 0 && (
                  <button type="button" title="Set as hover image (2nd position)" onClick={() => toggleHover(index)} className="p-1.5 rounded-md bg-white/20 text-white hover:bg-white/40">
                    <Layers className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  title="Edit alt text"
                  onClick={() => {
                    setEditing(index);
                    setEditAlt(img.alt ?? '');
                  }}
                  className="p-1.5 rounded-md bg-white/20 text-white hover:bg-white/40"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button type="button" title="Remove image" onClick={() => removeAt(index)} className="p-1.5 rounded-md bg-red-500/80 text-white hover:bg-red-600">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <GripVertical className="w-3.5 h-3.5 text-white/70" />
            </div>

            {/* Inline alt editor */}
            {editing === index && (
              <div className="absolute inset-x-0 bottom-0 p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveAlt(index)} autoFocus placeholder="Alt text" className="admin-input !h-8 !px-2 text-[11px]" />
                <div className="flex justify-end gap-1 mt-1">
                  <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                  <button type="button" onClick={() => saveAlt(index)} className="p-1 text-emerald-600"><Check className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add tile */}
        {!disabled && images.length < max && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-4" style={frameStyle}>
            {uploading ? (
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} title="Upload images" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Upload images">
                    <Upload className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setLibraryOpen(true)} title="Choose from library" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Choose from media library">
                    <Library className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setUrlOpen((v) => !v)} title="Paste image URL" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Paste image URL">
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
                {urlOpen && (
                  <div className="flex gap-1 w-full">
                    <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUrl()} placeholder="https://…" className="admin-input !h-8 text-[11px]" aria-label="Image URL" />
                    <button type="button" onClick={addUrl} className="admin-btn-secondary px-2 text-[11px] shrink-0">Add</button>
                  </div>
                )}
                <p className="text-[10px] text-center">Drag tiles to reorder · 2nd image = hover</p>
              </>
            )}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.avif,image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif" multiple className="hidden" onChange={(e) => { if (e.target.files) void handleUpload(e.target.files); e.target.value = ''; }} />
      {libraryOpen && (
        <MediaLibraryDialog
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onPickMulti={handleLibraryPick}
          multi
          title="Add images to gallery"
          folder={folder}
        />
      )}
    </div>
  );
}
