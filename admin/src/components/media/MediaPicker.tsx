import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Library,
  RefreshCcw,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Crop,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ImageOff,
  Sparkles,
  Loader2,
  Maximize2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MediaFile } from '@shared/types';
import { getMediaRatio } from '@shared/constants';
import { detectRatio } from '@shared/utils';
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
import MediaLibraryDialog from './MediaLibraryDialog';
import CropDialog from './CropDialog';
import { resolveMediaUrl } from '../../lib/mediaUrl';

export interface MediaPickerMeta {
  alt?: string;
  title?: string;
  mediaId?: string;
  width?: number;
  height?: number;
}

interface MediaPickerProps {
  value?: string;
  onChange: (url: string, meta?: MediaPickerMeta) => void;
  label?: React.ReactNode;
  /** Key of MEDIA_RATIOS — drives the preview frame and the auto-fit crop ratio. */
  ratio?: string;
  folder?: string;
  accept?: string;
  allowCrop?: boolean;
  allowPaste?: boolean;
  allowLibrary?: boolean;
  allowRemove?: boolean;
  compact?: boolean;
  disabled?: boolean;
  placeholder?: string;
  altValue?: string;
  altOnChange?: (v: string) => void;
  titleValue?: string;
  titleOnChange?: (v: string) => void;
  showSeo?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'fitting' | 'verifying' | 'error';
type ImageState = 'empty' | 'loading' | 'ready' | 'broken';

export default function MediaPicker({
  value = '',
  onChange,
  label,
  ratio,
  folder = 'general',
  accept,
  allowCrop = true,
  allowPaste = true,
  allowLibrary = true,
  allowRemove = true,
  compact = false,
  disabled = false,
  placeholder = 'https://… or pick from the library',
  altValue,
  altOnChange,
  titleValue,
  titleOnChange,
  showSeo = false,
}: MediaPickerProps) {
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
  const isVideoValue = useCallback((v: string) => {
    return /\.(mp4|webm)(\?|#|$)/i.test(v);
  }, []);
  const allowsVideo = Boolean(accept && /video/i.test(accept));
  const acceptedTypes = allowsVideo ? `${ACCEPTED_IMAGE_ACCEPT},video/mp4,video/webm,.mp4,.webm` : ACCEPTED_IMAGE_ACCEPT;
  const validExtRe = useMemo(() => allowsVideo ? /^(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|heic|heif|mp4|webm)$/i : /^(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|heic|heif)$/i, [allowsVideo]);

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
    if (isVideoValue(value)) {
      setImgState('ready');
      return;
    }
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
    img.src = resolveMediaUrl(value) ?? '';
    return () => {
      cancelled = true;
    };
  }, [value, isVideoValue]);

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
      // Never force a crop on upload — ratios are recommendations only. The
      // manager can re-upload, crop to fit, or keep the natural ratio anytime.
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
        if (!validExtRe.test(ext)) {
          toast.error(`"${f.name}" — unsupported file type (jpg, jpeg, png, webp, svg, gif, avif, bmp, tiff, heic, heif${allowsVideo ? ', mp4, webm' : ''} only)`);
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
          altText: altValue || generateAltFromFilename(valid[0].name),
          title: titleValue || generateTitleFromFilename(valid[0].name),
          onProgress: setUploadProgress,
        });
        await handleUploaded(uploaded);
      } catch (error) {
        setUploadState('error');
        notifyError(error);
      }
    },
    [folder, altValue, titleValue, handleUploaded, allowsVideo, validExtRe]
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
      if (altOnChange && file.altText) altOnChange(file.altText);
      if (titleOnChange && file.title) titleOnChange(file.title);
      setLibraryOpen(false);
      toast.success('Media selected');
    },
    [onChange, altOnChange, titleOnChange]
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

  const autoGenerateSeo = () => {
    if (altOnChange) altOnChange(generateAltFromFilename(media?.originalName || value.split('/').pop() || 'image'));
    if (titleOnChange) titleOnChange(generateTitleFromFilename(media?.originalName || value.split('/').pop() || 'image'));
    toast.success('Alt & title generated from filename');
  };

  const removeImage = () => {
    setMedia(null);
    onChange('');
    setImgState('empty');
  };

  const busy = uploadState === 'uploading' || uploadState === 'fitting' || uploadState === 'verifying';

  // Preview frame sizing (kept inside the component to preserve exact ratios)
  const frameStyle: React.CSSProperties | undefined = ratioInfo && ratioInfo.w > 0 && ratioInfo.h > 0
    ? { aspectRatio: `${ratioInfo.w} / ${ratioInfo.h}`, maxWidth: ratioInfo.w / ratioInfo.h > 2.2 ? '100%' : undefined, height: ratioInfo.w / ratioInfo.h > 2.2 ? 'auto' : undefined }
    : undefined;

  const isWide = ratioInfo && ratioInfo.w > 0 && ratioInfo.h > 0 && ratioInfo.w / ratioInfo.h > 2.2;

  // Compare the actual image dimensions against the required ratio (2-decimal tolerance).
  const ratioState = useMemo<'match' | 'mismatch' | null>(() => {
    if (!dims || dims.w <= 0 || dims.h <= 0) return null;
    if (!ratioInfo || ratioInfo.w <= 0 || ratioInfo.h <= 0) return null;
    const imageRatio = dims.w / dims.h;
    const requiredRatio = ratioInfo.w / ratioInfo.h;
    return Math.abs(imageRatio - requiredRatio) < 0.02 ? 'match' : 'mismatch';
  }, [dims, ratioInfo]);

  return (
    <div className="w-full min-w-0 flex flex-col">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="admin-label">
            {label}
            {ratioInfo && ratioInfo.label && <span className="ml-2 text-[11px] font-normal text-slate-400">— {ratioInfo.label} ratio {ratioInfo.w > 0 ? `${ratioInfo.w}:${ratioInfo.h}` : ''}</span>}
          </label>
          {media && <span className="text-[11px] text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> In media library</span>}
        </div>
      )}

      {/* Main card */}
      <div
        className={`group relative flex-1 w-full min-w-0 overflow-hidden rounded-2xl border transition-all duration-300 ${dragOver ? 'border-slate-900 dark:border-slate-100 ring-2 ring-slate-900/10 dark:ring-slate-100/10' : 'border-slate-200 dark:border-slate-800'} ${busy ? 'opacity-80' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) void handleFiles(e.dataTransfer.files);
        }}
      >
        {!compact && (
          <div className="absolute inset-x-0 top-0 z-10 px-3 py-2 rounded-t-2xl flex items-center gap-1.5 bg-gradient-to-b from-white/90 to-transparent dark:from-slate-900/90">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Image</span>
            {isWide && <span className="text-[11px] text-slate-400">· wide banner</span>}
            {media?.favorite && <span className="text-[11px] text-amber-500">★ favorite</span>}
          </div>
        )}

        <div className={`flex ${compact ? '' : 'flex-col sm:flex-row'} gap-4 min-w-0 ${compact ? 'p-3' : 'p-5'}`}>
          {/* Preview */}
          <div className={`shrink-0 min-w-0 ${compact ? 'w-24' : 'w-full sm:w-2/5'} ${isWide ? 'sm:w-1/2' : ''}`}>
            <div
              className="relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center"
              style={frameStyle ?? { aspectRatio: '4 / 3', maxWidth: '100%' }}
              aria-label="Image preview"
            >
              {imgState === 'empty' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Upload className="w-7 h-7" />
                  <p className="text-[11px] px-2 text-center">No image yet</p>
                </div>
              )}
              {imgState === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white dark:bg-slate-900">
                  <div className="w-7 h-7 border-2 border-slate-200 dark:border-slate-700 border-t-slate-500 rounded-full animate-spin" />
                  <p className="text-[11px]">Loading preview…</p>
                </div>
              )}
              {imgState === 'broken' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400 bg-white dark:bg-slate-900">
                  <ImageOff className="w-7 h-7" />
                  <p className="text-[11px] px-3 text-center">Broken image — the URL may be invalid or removed</p>
                </div>
              )}
              {imgState === 'ready' && value && !isVideoValue(value) && (
                <img src={resolveMediaUrl(value) ?? ''} alt={altValue || 'Preview'} className="w-full h-full object-contain" draggable={false} />
              )}
              {imgState === 'ready' && value && isVideoValue(value) && (
                <video src={resolveMediaUrl(value) ?? ''} className="w-full h-full object-contain" muted playsInline />
              )}
              {imgState === 'ready' && value && !isVideoValue(value) && !busy && (
                <button
                  type="button"
                  onClick={() => setLargePreview(true)}
                  className="absolute bottom-2 right-2 z-10 p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Expand preview"
                  title="Expand preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
              {busy && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-700 dark:text-slate-200" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {uploadState === 'fitting' ? 'Fitting to ratio…' : uploadState === 'verifying' ? 'Verifying URL…' : `Uploading… ${uploadProgress}%`}
                  </p>
                  {uploadState === 'uploading' && (
                    <div className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900 dark:bg-slate-100 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Meta chips */}
            {value && imgState === 'ready' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dims && dims.w > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                    {dims.w}×{dims.h}
                  </span>
                )}
                {media ? (
                  <>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 uppercase">{fileExtension(media.originalName) || media.mimeType.split('/')[1]}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">{formatBytes(media.size)}</span>
                  </>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 uppercase">{fileExtension(value)}</span>
                )}
                {media?.variants && (media.variants.thumb || media.variants.medium || media.variants.large || media.variants.avif) && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5" title="WebP/AVIF variants generated">
                    <CheckCircle2 className="w-3 h-3" />
                    Optimized{media.optimization?.savingsPercent ? ` −${media.optimization.savingsPercent}%` : ''}
                  </span>
                )}
                {media && !media.variants && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title="Not compressible (SVG, GIF or video)">
                    <AlertCircle className="w-3 h-3" />
                    Original
                  </span>
                )}
              </div>
            )}

            {/* Ratio match indicator */}
            {value && imgState === 'ready' && dims && (
              <div className="mt-2">
                <span className="admin-badge-slate">
                  <Crop className="w-3.5 h-3.5" />
                  Detected ratio: <b>{dims && !isVideoValue(value) ? (detectRatio(dims.w, dims.h) ?? 'Free') : '—'}</b>
                  {ratioInfo && ratioInfo.w > 0 && (
                    <span className="ml-1 text-slate-400 dark:text-slate-500">· needs {ratioInfo.w}:{ratioInfo.h}</span>
                  )}
                </span>
              </div>
            )}
            {value && imgState === 'ready' && ratioState && ratioInfo && ratioInfo.w > 0 && (
              <div className="mt-2">
                {ratioState === 'match' ? (
                  <span className="admin-badge-green">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ratio matches ({ratioInfo.w}:{ratioInfo.h})
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="admin-badge-amber">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {dims && `Ratio mismatch — image is ${dims.w}×${dims.h}, needs ${ratioInfo.w}:${ratioInfo.h}`}
                    </span>
                    {allowCrop && !isVideoValue(value) && (
                      <button
                        type="button"
                        onClick={() => setCropOpen(true)}
                        disabled={busy}
                        className="admin-btn-secondary px-3 py-1.5 text-[11px] flex items-center gap-1"
                      >
                        <Crop className="w-3 h-3" />
                        Crop to fit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className={`flex-1 min-w-0 ${compact ? '' : 'flex flex-col'}`}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="admin-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                {value ? 'Replace image' : 'Upload image'}
              </button>
              <input ref={fileRef} type="file" accept={acceptedTypes} className="hidden" onChange={handleReplace} />
              {allowLibrary && (
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  disabled={busy}
                  className="admin-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <Library className="w-3.5 h-3.5" />
                  Media library
                </button>
              )}
              {allowPaste && (
                <button
                  type="button"
                  onClick={() => setUrlOpen((o) => !o)}
                  disabled={busy}
                  className="admin-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Paste URL
                </button>
              )}
              {value && allowCrop && !isVideoValue(value) && ratioInfo && ratioInfo.w > 0 && (
                <button
                  type="button"
                  onClick={() => setCropOpen(true)}
                  disabled={busy}
                  className="admin-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                >
                  <Crop className="w-3.5 h-3.5" />
                  Crop
                </button>
              )}
            </div>

            {/* URL paste row */}
            {urlOpen && (
              <div className="flex gap-2 mt-3">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void applyUrl(urlInput)}
                  placeholder={placeholder}
                  className="admin-input !h-9 text-xs min-w-0 flex-1"
                  aria-label="Image URL"
                  autoFocus
                />
                <button type="button" onClick={() => void applyUrl(urlInput)} disabled={busy || !urlInput.trim()} className="admin-btn-secondary px-3 py-2 text-xs shrink-0">
                  Apply
                </button>
                <button type="button" onClick={() => setUrlOpen(false)} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Close URL input">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Actions for existing value */}
            {value && (
              <div className="flex flex-wrap items-center gap-1 mt-3">
                <button type="button" onClick={copyUrl} className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-slate-600 dark:text-slate-300" title="Copy image URL">
                  <Copy className="w-3 h-3" /> Copy URL
                </button>
                <a href={resolveMediaUrl(value) ?? value} download target="_blank" rel="noopener noreferrer" className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-slate-600 dark:text-slate-300" title="Download image">
                  <Download className="w-3 h-3" /> Download
                </a>
                <a href={resolveMediaUrl(value) ?? value} target="_blank" rel="noopener noreferrer" className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-slate-600 dark:text-slate-300" title="Open image in new tab">
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
                {value && allowCrop && !isVideoValue(value) && !(ratioInfo && ratioInfo.w > 0) && (
                  <button type="button" onClick={() => setCropOpen(true)} className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-slate-600 dark:text-slate-300" title="Crop image">
                    <Crop className="w-3 h-3" /> Crop
                  </button>
                )}
                {allowRemove && (
                  <button type="button" onClick={removeImage} className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove image">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
                {media && (
                  <button type="button" onClick={() => setMedia(null)} className="admin-btn-ghost px-2.5 py-1.5 text-[11px] flex items-center gap-1 text-slate-600 dark:text-slate-300" title="Forget library link (keep URL)">
                    <RefreshCcw className="w-3 h-3" /> Detach
                  </button>
                )}
              </div>
            )}

            {dragOver && (
              <p className="mt-3 text-xs text-center py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300">
                Drop images to upload
              </p>
            )}

            {!value && !urlOpen && (
              <p className="mt-3 text-[11px] text-slate-400 flex items-start gap-1.5">
                <span className="mt-0.5">Drag &amp; drop, upload, paste a URL, or choose from the library.</span>
              </p>
            )}

            {/* SEO fields */}
            {showSeo && altOnChange && titleOnChange && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> SEO
                  </span>
                  <button type="button" onClick={autoGenerateSeo} className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
                    Auto-generate from filename
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1" htmlFor={`media-alt-${label?.toString().slice(0, 12)}`}>Alt text</label>
                    <input id={`media-alt-${label?.toString().slice(0, 12)}`} value={altValue ?? ''} onChange={(e) => altOnChange(e.target.value)} placeholder="Describe the image for screen readers & SEO" className="admin-input !h-9 text-xs" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1" htmlFor={`media-title-${label?.toString().slice(0, 12)}`}>Title</label>
                    <input id={`media-title-${label?.toString().slice(0, 12)}`} value={titleValue ?? ''} onChange={(e) => titleOnChange(e.target.value)} placeholder="Optional image title" className="admin-input !h-9 text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {libraryOpen && (
        <MediaLibraryDialog
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onSelect={handlePicked}
          folder={folder}
          usage
        />
      )}
      {cropOpen && value && (
        <CropDialog
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
      {largePreview && value && !isVideoValue(value) && (
        <div
          className="admin-modal-overlay !z-[115]"
          role="dialog"
          aria-modal="true"
          aria-label="Large image preview"
          onClick={() => setLargePreview(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLargePreview(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={resolveMediaUrl(value) ?? ''}
              alt={altValue || 'Preview'}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />
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
