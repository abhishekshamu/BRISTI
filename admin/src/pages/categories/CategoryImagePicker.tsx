import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Library,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Crop,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
  Loader2,
  Maximize2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MediaFile } from '@shared/types';
import { getMediaRatio } from '@shared/constants';
import {
  uploadFiles,
  replaceMedia,
  verifyUrl,
  formatBytes,
  fileExtension,
  generateAltFromFilename,
  generateTitleFromFilename,
  ACCEPTED_IMAGE_ACCEPT,
} from '../../services/media.service';
import MediaLibraryDialog from '../../components/media/MediaLibraryDialog';
import CategoryCropDialog from './CategoryCropDialog';
import { resolveMediaUrl } from '../../lib/mediaUrl';

export interface CategoryImageMeta {
  alt?: string;
  title?: string;
  mediaId?: string;
  width?: number;
  height?: number;
}

interface CategoryImagePickerProps {
  value?: string;
  onChange: (url: string, meta?: CategoryImageMeta) => void;
  /** Key of MEDIA_RATIOS — drives the preview frame and the crop ratio. */
  ratio: string;
  folder?: string;
}

type UploadState = 'idle' | 'uploading' | 'verifying' | 'error';
type ImageState = 'empty' | 'loading' | 'ready' | 'broken';

/**
 * Premium large-preview media uploader used ONLY by the Category Edit page.
 * Reuses the exact same upload / replace / verify / crop / library services
 * and dialogs as the rest of the admin, so behaviour is identical.
 */
export default function CategoryImagePicker({ value = '', onChange, ratio, folder = 'categories' }: CategoryImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [largePreview, setLargePreview] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);
  const [imgState, setImgState] = useState<ImageState>('empty');
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [media, setMedia] = useState<MediaFile | null>(null);

  const ratioInfo = ratio ? getMediaRatio(ratio) : null;

  // --- preview image state -------------------------------------------------
  useEffect(() => {
    if (!value) {
      setImgState('empty');
      setDims(null);
      setLargePreview(false);
      return;
    }
    setImgState('loading');
    setDims(null);
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
      setImgState('ready');
    };
    img.onerror = () => {
      if (cancelled) return;
      setImgState('broken');
    };
    img.src = value;
    return () => {
      cancelled = true;
    };
  }, [value]);

  // --- helpers -------------------------------------------------------------
  const notifyError = (error: any) => {
    const message = error?.response?.data?.message || error?.message || 'Upload failed';
    toast.error(message);
  };

  const handleUploaded = useCallback(
    async (uploaded: MediaFile[]) => {
      const file = uploaded[0];
      if (!file) return;
      if ((file as any).duplicated) {
        toast('Duplicate file detected — reusing the existing copy', { icon: '♻️' });
      }
      setMedia(file);
      // Ratios are recommendations only — never force a crop on upload.
      onChange(file.url, { mediaId: String(file._id), width: file.width, height: file.height });
      if (!(file as any).duplicated) {
        toast(ratioInfo && ratioInfo.w > 0 ? 'Image uploaded — check the ratio match below' : 'Image uploaded', { icon: ratioInfo && ratioInfo.w > 0 ? '👁️' : '✅' });
      }
      setUploadState('idle');
    },
    [onChange, ratioInfo]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      const valid = list.filter((f) => {
        const ext = fileExtension(f.name);
        if (!/^(jpg|jpeg|png|webp|svg|gif|avif)$/i.test(ext)) {
          toast.error(`"${f.name}" — unsupported file type (jpg, jpeg, png, webp, svg, gif, avif only)`);
          return false;
        }
        if (f.size > 25 * 1024 * 1024) {
          toast.error(`"${f.name}" — file exceeds the 25 MB limit`);
          return false;
        }
        return true;
      });
      if (valid.length === 0) return;
      setUploadState('uploading');
      setUploadProgress(0);
      try {
        const uploaded = await uploadFiles(valid, {
          folder,
          altText: generateAltFromFilename(valid[0].name),
          title: generateTitleFromFilename(valid[0].name),
          onProgress: setUploadProgress,
        });
        await handleUploaded(uploaded);
      } catch (error) {
        setUploadState('error');
        notifyError(error);
      }
    },
    [folder, handleUploaded]
  );

  const handleReplace = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setUploadState('uploading');
      try {
        if (media && String(media._id)) {
          const updated = await replaceMedia(String(media._id), file);
          setMedia(updated);
          onChange(updated.url, { mediaId: String(updated._id), width: updated.width, height: updated.height });
          toast.success('Image replaced — previous version saved in history');
        } else {
          await handleFiles([file]);
        }
      } catch (error) {
        setUploadState('error');
        notifyError(error);
      } finally {
        setUploadState('idle');
      }
    },
    [media, onChange, handleFiles]
  );

  const applyUrl = useCallback(
    async (raw: string) => {
      const url = raw.trim();
      if (!url) return;
      setUploadState('verifying');
      try {
        const check = await verifyUrl(url);
        if (!check.ok) {
          setUploadState('error');
          toast.error(check.error || 'That URL does not point to a reachable image');
          return;
        }
        setUploadState('idle');
        onChange(url);
        toast.success('Image URL applied');
        setUrlInput('');
        setUrlOpen(false);
      } catch {
        setUploadState('idle');
        onChange(url);
        toast.success('Image URL applied');
        setUrlOpen(false);
      }
    },
    [onChange]
  );

  const handlePicked = useCallback(
    (file: MediaFile) => {
      setMedia(file);
      onChange(file.url, { mediaId: String(file._id), alt: file.altText, title: file.title, width: file.width, height: file.height });
      setLibraryOpen(false);
      toast.success('Media selected');
    },
    [onChange]
  );

  const copyUrl = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Image URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  }, [value]);

  const removeImage = () => {
    setMedia(null);
    onChange('');
    setImgState('empty');
  };

  const busy = uploadState === 'uploading' || uploadState === 'verifying';

  // Compare the actual image dimensions against the required ratio (2-decimal tolerance).
  const ratioState = useMemo<'match' | 'mismatch' | null>(() => {
    if (!dims || dims.w <= 0 || dims.h <= 0) return null;
    if (!ratioInfo || ratioInfo.w <= 0 || ratioInfo.h <= 0) return null;
    const imageRatio = dims.w / dims.h;
    const requiredRatio = ratioInfo.w / ratioInfo.h;
    return Math.abs(imageRatio - requiredRatio) < 0.02 ? 'match' : 'mismatch';
  }, [dims, ratioInfo]);

  // Preview frame keeps the exact storefront ratio.
  const frameStyle: React.CSSProperties | undefined =
    ratioInfo && ratioInfo.w > 0 && ratioInfo.h > 0
      ? { aspectRatio: `${ratioInfo.w} / ${ratioInfo.h}` }
      : { aspectRatio: '4 / 5' };

  const ratioLabel = ratioInfo && ratioInfo.w > 0 ? `${ratioInfo.label} · ${ratioInfo.w}:${ratioInfo.h}` : null;

  const openFilePicker = () => fileRef.current?.click();

  return (
    <div className="w-full">
      {/* Large preview frame — exact ratio */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
          dragOver
            ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/60'
            : 'border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900/50'
        } ${busy ? 'opacity-80' : ''}`}
        style={frameStyle}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        aria-label="Category image preview"
      >
        {ratioLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/60 dark:ring-slate-700/60">
            {ratioLabel}
          </span>
        )}

        {imgState === 'empty' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">No image yet</p>
              <p className="text-[11.5px] mt-1">Drag &amp; drop here, upload, paste a URL, or pick from the library</p>
            </div>
          </div>
        )}
        {imgState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white/70 dark:bg-slate-900/70">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-slate-500 rounded-full animate-spin" />
            <p className="text-xs">Loading preview…</p>
          </div>
        )}
        {imgState === 'broken' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-red-400 bg-white dark:bg-slate-900">
            <ImageOff className="w-7 h-7" />
            <p className="text-xs px-4 text-center">Broken image — the URL may be invalid or removed</p>
          </div>
        )}
        {imgState === 'ready' && value && (
          <img src={resolveMediaUrl(value) ?? ''} alt="Category preview" className="w-full h-full object-cover" draggable={false} />
        )}
        {imgState === 'ready' && value && !busy && (
          <button
            type="button"
            onClick={() => setLargePreview(true)}
            className="absolute bottom-3 right-3 z-10 p-2 rounded-xl bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Expand preview"
            title="Expand preview"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 bg-white/75 dark:bg-slate-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-slate-700 dark:text-slate-200" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {uploadState === 'verifying' ? 'Verifying URL…' : `Uploading… ${uploadProgress}%`}
            </p>
            {uploadState === 'uploading' && (
              <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 dark:bg-slate-100 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Under preview — resolution, ratio, status */}
      {value && imgState === 'ready' && dims && (
        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          <InfoCell label="Resolution" value={`${dims.w}×${dims.h}`} />
          <InfoCell
            label="Ratio"
            value={ratioInfo && ratioInfo.w > 0 ? `${ratioInfo.w}:${ratioInfo.h}` : '—'}
          />
          {ratioState === 'match' ? (
            <InfoCell label="Status" value="Perfect" tone="green" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
          ) : ratioState === 'mismatch' ? (
            <InfoCell label="Status" value="Needs Crop" tone="amber" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
          ) : (
            <InfoCell label="Status" value="—" />
          )}
        </div>
      )}

      {/* Grouped actions */}
      <div className="mt-5 space-y-4">
        {/* Primary actions */}
        <div className="space-y-2">
          <GroupLabel>Primary Actions</GroupLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={busy}
              className={`admin-btn-primary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 ${value ? '' : 'col-span-2'}`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <input ref={fileRef} type="file" accept={ACCEPTED_IMAGE_ACCEPT} className="hidden" onChange={handleReplace} />
            {value && (
              <button
                type="button"
                onClick={openFilePicker}
                disabled={busy}
                className="admin-btn-primary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                Replace
              </button>
            )}
          </div>
        </div>

        {/* Secondary actions */}
        <div className="space-y-2">
          <GroupLabel>Secondary Actions</GroupLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              disabled={busy}
              className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Library className="w-4 h-4" />
              Media Library
            </button>
            <button
              type="button"
              onClick={() => setUrlOpen((o) => !o)}
              disabled={busy}
              className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Link2 className="w-4 h-4" />
              Paste URL
            </button>
          </div>
        </div>

        {/* Utilities */}
        {value && (
          <div className="space-y-2">
            <GroupLabel>Utilities</GroupLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCropOpen(true)}
                disabled={busy}
                title="Open the crop tool to match the required ratio"
                className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Crop className="w-4 h-4" />
                Crop
              </button>
              <button
                type="button"
                onClick={copyUrl}
                className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy URL
              </button>
              <a href={value} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
              <a href={value} download target="_blank" rel="noopener noreferrer" className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download
              </a>
              <button
                type="button"
                onClick={removeImage}
                className="admin-btn-ghost !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 col-span-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        )}

        {/* URL paste row */}
        {urlOpen && (
          <div className="flex items-center gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void applyUrl(urlInput)}
              placeholder="https://… or paste an image URL"
              className="admin-input !h-12 !rounded-xl !bg-[#FAFAFA] dark:!bg-slate-900/60 px-4 text-sm flex-1 min-w-0"
              aria-label="Image URL"
              autoFocus
            />
            <button type="button" onClick={() => void applyUrl(urlInput)} disabled={busy || !urlInput.trim()} className="admin-btn-primary !h-12 !rounded-xl px-5 text-[13px] shrink-0 disabled:opacity-60">
              Apply
            </button>
            <button
              type="button"
              onClick={() => setUrlOpen(false)}
              className="w-12 h-12 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              aria-label="Close URL input"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {media && value && (
          <p className="text-[11.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            In media library · {formatBytes(media.size)}
          </p>
        )}
      </div>

      {libraryOpen && (
        <MediaLibraryDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} onSelect={handlePicked} folder={folder} usage />
      )}
      {cropOpen && value && (
        <CategoryCropDialog
          src={resolveMediaUrl(media?.url || value) ?? value}
          mediaId={media ? String(media._id) : undefined}
          folder={folder}
          initialRatio={ratioInfo && ratioInfo.w > 0 ? { w: ratioInfo.w, h: ratioInfo.h } : undefined}
          open={cropOpen}
          onClose={() => setCropOpen(false)}
          onApplied={(result) => {
            setMedia(media);
            onChange(result.url, { mediaId: media ? String(media._id) : undefined, width: result.width, height: result.height });
          }}
        />
      )}

      {/* Large preview lightbox */}
      {largePreview && value && (
        <div
          className="admin-modal-overlay !z-[115]"
          role="dialog"
          aria-modal="true"
          aria-label="Large image preview"
          onClick={() => setLargePreview(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLargePreview(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={resolveMediaUrl(value) ?? ''} alt="Category preview" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" />
            <button
              type="button"
              onClick={() => setLargePreview(false)}
              autoFocus
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white">
              <span className="max-w-[60vw] truncate" title={media?.originalName || value}>
                {media?.originalName || value}
              </span>
              {dims && dims.w > 0 && <span className="opacity-80">{dims.w}×{dims.h}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{children}</p>
  );
}

function InfoCell({ label, value, tone = 'default', icon }: { label: string; value: string; tone?: 'default' | 'green' | 'amber'; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#FAFAFA] dark:bg-slate-900/60 px-3 py-2.5 text-center ring-1 ring-slate-100 dark:ring-slate-800 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={`mt-0.5 flex items-center justify-center gap-1 text-[13px] font-semibold truncate ${
          tone === 'green'
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone === 'amber'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}