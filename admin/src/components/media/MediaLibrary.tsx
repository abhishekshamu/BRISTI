import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Grid3X3,
  List,
  Upload,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Heart,
  Folder,
  X,
  RefreshCw,
  FolderInput,
  FileImage,
  AlertTriangle,
  Check,
  History,
  Replace,
  Sparkles,
  Loader2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MediaFile, MediaUsageEntry } from '@shared/types';
import { MEDIA_FOLDERS, MEDIA_RATIOS, MEDIA_SCOPES } from '@shared/constants';
import { detectRatio } from '@shared/utils';
import {
  fetchMedia,
  fetchMediaById,
  fetchFolders,
  fetchUsage,
  uploadFiles,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  bulkMoveMedia,
  replaceMedia,
  restoreMediaVersion,
  replaceEverywhere,
  fitMedia,
  formatBytes,
  totalUsageOf,
  ACCEPTED_IMAGE_ACCEPT,
} from '../../services/media.service';
import CropDialog from './CropDialog';
import MediaLibraryDialog from './MediaLibraryDialog';
import ConfirmDialog from '../ui/ConfirmDialog';

const SCOPE_LABELS: Record<string, string> = Object.fromEntries(MEDIA_SCOPES.map((s) => [s.id, s.label]));

interface MediaLibraryProps {
  /** Single-select mode: clicking a file calls onSelect and closes. */
  onSelect?: (file: MediaFile) => void;
  /** Multi-select mode: show a confirm bar, then call onPickMulti. */
  onPickMulti?: (files: MediaFile[]) => void;
  multi?: boolean;
  compact?: boolean;
  initialFolder?: string;
  usage?: boolean;
  allowUpload?: boolean;
  autoCloseAfterSelect?: boolean;
}

type SortKey = 'newest' | 'oldest' | 'name' | 'size' | 'used';

export default function MediaLibrary({ onSelect, onPickMulti, multi = false, compact = false, initialFolder, usage = true, allowUpload = true }: MediaLibraryProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 60, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [folder, setFolder] = useState(initialFolder ?? 'all');
  const [availableFolders, setAvailableFolders] = useState<string[]>(MEDIA_FOLDERS);
  const [tag, setTag] = useState('');
  const [type, setType] = useState<'all' | 'image' | 'video'>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [safeDeleteTarget, setSafeDeleteTarget] = useState<MediaFile | null>(null);
  const [bulkBlocked, setBulkBlocked] = useState<any[] | null>(null);
  const [replacePickerOpen, setReplacePickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMedia({
        folder: folder === 'all' ? undefined : folder,
        search: debouncedSearch || undefined,
        tag: tag || undefined,
        type,
        sort,
        favorite: favoriteOnly || undefined,
        unused: unusedOnly || undefined,
        usage,
        page: 1,
        limit: 60,
      });
      setFiles(result.data);
      setUsageMap(result.usage);
      setPagination(result.pagination);
    } catch {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [folder, debouncedSearch, tag, type, sort, favoriteOnly, unusedOnly, usage]);

  const reload = useCallback(() => {
    void load();
    void fetchFolders()
      .then((extra) => {
        const merged = [...new Set([...MEDIA_FOLDERS, ...extra.filter((f) => f && f !== '/')])];
        setAvailableFolders(merged);
      })
      .catch(() => undefined);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files) {
      for (const t of f.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
  }, [files]);

  // -- upload ---------------------------------------------------------------
  const handleUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const list = Array.from(fileList);
      if (list.length === 0) return;
      setUploading(true);
      setUploadProgress(0);
      try {
        const uploaded = await uploadFiles(list, {
          folder: folder === 'all' ? 'general' : folder,
          onProgress: setUploadProgress,
        });
        const duplicates = uploaded.filter((f) => (f as any).duplicated).length;
        const errors = uploaded.filter((f) => (f as any).error).length;
        const ok = uploaded.length - duplicates - errors;
        if (ok > 0) toast.success(`${ok} file${ok > 1 ? 's' : ''} uploaded`);
        if (duplicates > 0) toast(`${duplicates} duplicate file${duplicates > 1 ? 's' : ''} reused`, { icon: '♻️' });
        if (errors > 0) toast.error(`${errors} file${errors > 1 ? 's' : ''} failed`);
        reload();
      } catch {
        toast.error('Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [folder, reload]
  );

  // -- selection -------------------------------------------------------------
  const toggleSelection = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelection((prev) => (prev.size === files.length ? new Set() : new Set(files.map((f) => String(f._id)))));
  };

  const selectedFiles = useMemo(() => files.filter((f) => selection.has(String(f._id))), [files, selection]);

  const handleBulkDelete = async () => {
    const ids = [...selection];
    if (ids.length === 0) return;
    const result = await bulkDeleteMedia(ids);
    if (result.blocked.length > 0) {
      setBulkBlocked(result.blocked);
      setSelection(new Set());
      reload();
    } else {
      toast.success(`${result.deleted} file${result.deleted > 1 ? 's' : ''} deleted`);
      setSelection(new Set());
      reload();
    }
  };

  const handleBulkMove = async (targetFolder: string) => {
    const ids = [...selection];
    if (ids.length === 0) return;
    try {
      const result = await bulkMoveMedia(ids, targetFolder);
      toast.success(`Moved ${result.moved} file${result.moved > 1 ? 's' : ''} to ${targetFolder || 'general'}`);
      setSelection(new Set());
      reload();
    } catch {
      toast.error('Move failed');
    }
  };

  const handleBulkDownload = () => {
    for (const f of selectedFiles) {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = f.originalName || f.filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    toast.success(`Downloading ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`);
  };

  const handlePick = (file: MediaFile) => {
    if (onSelect) {
      onSelect(file);
      return;
    }
    if (multi && onPickMulti) {
      toggleSelection(String(file._id));
      return;
    }
    if (multi && !onPickMulti) toggleSelection(String(file._id));
  };

  const confirmMultiPick = () => {
    if (onPickMulti) onPickMulti(selectedFiles);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  // -- safe delete -----------------------------------------------------------
  const requestDelete = async (file: MediaFile) => {
    try {
      const usageInfo = await fetchUsage(String(file._id));
      if (usageInfo.total > 0) {
        setSafeDeleteTarget({ ...file, usage: usageInfo.entries });
        return;
      }
      await deleteMedia(String(file._id));
      toast.success('File deleted');
      reload();
    } catch (error: any) {
      const usage = error?.response?.data?.usage;
      if (usage) {
        setSafeDeleteTarget({ ...file, usage: usage.entries ?? usage });
      } else {
        toast.error(error?.response?.data?.message || 'Delete failed');
      }
    }
  };

  const confirmDeleteAnyway = async () => {
    if (!safeDeleteTarget) return;
    try {
      await deleteMedia(String(safeDeleteTarget._id), true);
      toast.success('File deleted anyway');
      setSafeDeleteTarget(null);
      reload();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleReplaceEverywhere = async (replacement: MediaFile) => {
    if (!safeDeleteTarget) return;
    try {
      const result = await replaceEverywhere(String(safeDeleteTarget._id), replacement.url);
      await deleteMedia(String(safeDeleteTarget._id), true);
      toast.success(`Replaced in ${result.replaced} place${result.replaced === 1 ? '' : 's'} and deleted`);
      setSafeDeleteTarget(null);
      setReplacePickerOpen(false);
      reload();
    } catch {
      toast.error('Replace-everywhere failed');
    }
  };

  const isVideo = (f: MediaFile) => f.mimeType?.startsWith('video/');

  return (
    <div className={compact ? '' : 'space-y-5'}>
      {/* Toolbar */}
      <div className="admin-card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, tag or alt text…"
              className="admin-input pl-10"
              aria-label="Search media"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="admin-input !w-auto" aria-label="Sort media">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A–Z</option>
              <option value="size">Largest</option>
              <option value="used">Recently used</option>
            </select>
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} aria-label="Grid view">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} aria-label="List view">
                <List className="w-4 h-4" />
              </button>
            </div>
            {allowUpload && (
              <label className="admin-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
                <input ref={fileRef} type="file" accept={ACCEPTED_IMAGE_ACCEPT} multiple className="hidden" onChange={(e) => { if (e.target.files) void handleUpload(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'image', label: 'Images' },
              { key: 'video', label: 'Videos' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key as typeof type)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${type === t.key ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => setFavoriteOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${favoriteOnly ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <Heart className="w-3 h-3" /> Favorites
          </button>
          <button
            type="button"
            onClick={() => setUnusedOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${unusedOnly ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <Sparkles className="w-3 h-3" /> Unused only
          </button>
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className="admin-input !w-auto !h-8 text-xs ml-auto" aria-label="Folder">
            <option value="all">All folders</option>
            {availableFolders.filter((f) => f && f !== '/').map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {pageTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Folder className="w-3 h-3" /> Tags:</span>
            {pageTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(tag === t ? '' : t)}
                className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${tag === t ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                #{t}
              </button>
            ))}
            {tag && (
              <button type="button" onClick={() => setTag('')} className="text-[10px] text-slate-400 underline underline-offset-2">
                clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selection.size > 0 && (
        <div className="admin-card p-3 flex flex-wrap items-center gap-2 border-slate-900/20 dark:border-slate-600/40">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 mr-1">{selection.size} selected</span>
          <button type="button" onClick={toggleAll} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
            {selection.size === files.length ? 'Deselect all' : 'Select all'}
          </button>
          <select onChange={(e) => { if (e.target.value) { void handleBulkMove(e.target.value); e.target.value = ''; } }} defaultValue="" className="admin-input !w-auto !h-8 text-xs" aria-label="Move selected to folder">
            <option value="" disabled>Move to folder…</option>
            {availableFolders.filter((f) => f !== 'all').map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button type="button" onClick={() => void handleBulkDelete()} className="admin-btn-danger px-3 py-1.5 text-xs flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button type="button" onClick={handleBulkDownload} className="admin-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          {onPickMulti && (
            <button type="button" onClick={confirmMultiPick} className="admin-btn-primary px-4 py-1.5 text-xs flex items-center gap-1 ml-auto">
              <Check className="w-3.5 h-3.5" /> Use {selection.size} selected
            </button>
          )}
          <button type="button" onClick={() => setSelection(new Set())} className="text-xs text-slate-400 hover:text-slate-600 px-2">
            Clear
          </button>
        </div>
      )}

      {/* Drag & drop upload zone */}
      <div
        className={dragOver ? 'rounded-xl border-2 border-dashed border-slate-900 dark:border-slate-100 p-8 bg-slate-50 dark:bg-slate-800/50 text-center' : ''}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (allowUpload) void handleUpload(e.dataTransfer.files); }}
      >
        {dragOver && (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Upload className="w-8 h-8" />
            <p className="text-sm font-medium">Drop files to upload</p>
            <p className="text-xs text-slate-400">jpg, jpeg, png, webp, svg, gif, avif</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">{error}</p>
            <button type="button" onClick={reload} className="admin-btn-secondary px-4 py-2 text-xs mt-4">Retry</button>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <FileImage className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No media found</p>
            <p className="text-xs text-slate-400 mt-1">Upload images or adjust the filters</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
            {files.map((file) => {
              const selected = selection.has(String(file._id));
              const used = totalUsageOf(file, usageMap);
              return (
                <div
                  key={String(file._id)}
                  className={`group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 transition-all ${selected ? 'border-slate-900 dark:border-slate-100' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${file.originalName}${used ? `, used in ${used} places` : ''}`}
                  onClick={() => handlePick(file)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePick(file);
                    }
                  }}
                >
                  {isVideo(file) ? (
                    <video src={file.thumbnailUrl || file.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={file.thumbnailUrl || file.url} alt={file.altText || file.originalName} loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {file.favorite && <Heart className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  {used > 0 && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] text-white backdrop-blur-sm">
                      {used} place{used === 1 ? '' : 's'}
                    </span>
                  )}
                  {file.ratio && (
                    <span
                      className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white/90 backdrop-blur-sm"
                      title={`Auto-detected ratio ${file.ratio} — images are never auto-cropped`}
                    >
                      {file.ratio}
                    </span>
                  )}
                  {selected && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-4 h-4 text-slate-900" />
                      </div>
                    </div>
                  )}
                  {/* hover actions */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                    <p className="text-[10px] text-white truncate max-w-[55%]">{file.originalName}</p>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1 rounded bg-white/20 hover:bg-white/40 text-white" title="Open in new tab" onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank', 'noopener'); }}>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button type="button" className="p-1 rounded bg-white/20 hover:bg-white/40 text-white" title="Copy URL" onClick={(e) => { e.stopPropagation(); void copyUrl(file.url); }}>
                        <Copy className="w-3 h-3" />
                      </button>
                      <button type="button" className="p-1 rounded bg-white/20 hover:bg-white/40 text-white" title="Details" onClick={(e) => { e.stopPropagation(); setDetailId(String(file._id)); }}>
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className="grid grid-cols-[40px_1fr_110px_90px_90px_70px_110px] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">
              <span />
              <span>Name</span>
              <span>Folder</span>
              <span>Size</span>
              <span>Dimensions</span>
              <span>Usage</span>
              <span>Uploaded</span>
            </div>
            {files.map((file) => {
              const selected = selection.has(String(file._id));
              const used = totalUsageOf(file, usageMap);
              return (
                <div
                  key={String(file._id)}
                  className={`grid grid-cols-[40px_1fr_110px_90px_90px_70px_110px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer ${selected ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  onClick={() => handlePick(file)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handlePick(file)}
                >
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {isVideo(file) ? <video src={file.thumbnailUrl || file.url} className="w-full h-full object-cover" muted /> : <img src={file.thumbnailUrl || file.url} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{file.originalName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{file.altText || file.mimeType?.split('/')[1]?.toUpperCase() || ''}</p>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{file.folder || '/'}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {file.width && file.height ? `${file.width}×${file.height}` : '—'}
                    {file.ratio && ` · ${file.ratio}`}
                  </span>
                  <span className={`text-[11px] tabular-nums ${used > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{used > 0 ? used : '—'}</span>
                  <span className="text-[11px] text-slate-400">{new Date(file.uploadedAt ?? file.createdAt ?? Date.now()).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && !loading && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {pagination.page} of {pagination.pages} · {pagination.total} file{pagination.total === 1 ? '' : 's'}
          </span>
          <button type="button" className="text-xs underline underline-offset-2" onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))} disabled={pagination.page >= pagination.pages}>
            Load more…
          </button>
        </div>
      )}

      {detailId && <MediaDetailDialog id={detailId} onClose={() => setDetailId(null)} onChanged={reload} onSafeDelete={(f) => void requestDelete(f)} />}
      {safeDeleteTarget && (
        <SafeDeleteDialog
          file={safeDeleteTarget}
          onCancel={() => setSafeDeleteTarget(null)}
          onDeleteAnyway={() => void confirmDeleteAnyway()}
          onReplaceEverywhere={() => setReplacePickerOpen(true)}
        />
      )}
      {replacePickerOpen && safeDeleteTarget && (
        <MediaLibraryDialog
          open={replacePickerOpen}
          onClose={() => setReplacePickerOpen(false)}
          onSelect={(replacement) => void handleReplaceEverywhere(replacement)}
          title="Replace everywhere with…"
        />
      )}
      {bulkBlocked && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Some files are in use">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Some files are in use
            </h3>
            <p className="text-sm text-slate-500 mt-2">{bulkBlocked.length} file{bulkBlocked.length === 1 ? '' : 's'} couldn't be deleted because they're referenced by storefront content.</p>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {bulkBlocked.map((b) => (
                <div key={b.id} className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-amber-800 dark:text-amber-300">
                  Used in {b.usage?.total ?? 0} places — open its details to replace or force delete.
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setBulkBlocked(null)} className="admin-btn-secondary px-4 py-2 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Media detail dialog
// ===========================================================================

function MediaDetailDialog({ id, onClose, onChanged, onSafeDelete }: { id: string; onClose: () => void; onChanged: () => void; onSafeDelete?: (file: MediaFile) => void }) {
  const [file, setFile] = useState<MediaFile | null>(null);
  const [usage, setUsage] = useState<MediaUsageEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alt, setAlt] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [folder, setFolder] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [fitRatio, setFitRatio] = useState('product');
  const [cropOpen, setCropOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchMediaById(id), fetchUsage(id)])
      .then(([f, u]) => {
        setFile(f);
        setUsage(u.entries);
        setAlt(f.altText ?? '');
        setTitle(f.title ?? '');
        setCaption(f.caption ?? '');
        setTags((f.tags ?? []).join(', '));
        setFolder(f.folder || '');
        setFavorite(Boolean(f.favorite));
      })
      .catch(() => toast.error('Failed to load file details'))
      .finally(() => setLoading(false));
  }, [id]);

  const saveMeta = async () => {
    setSaving(true);
    try {
      await updateMedia(id, {
        altText: alt,
        title,
        caption,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        folder,
        favorite,
      });
      toast.success('Details saved');
      onChanged();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !file) return;
    try {
      const updated = await replaceMedia(id, f);
      setFile(updated);
      onChanged();
      toast.success('Replaced — previous version saved to history');
    } catch {
      toast.error('Replace failed');
    }
  };

  const handleFit = async () => {
    const ratio = MEDIA_RATIOS[fitRatio];
    if (!ratio || ratio.w === 0) return;
    try {
      const result = await fitMedia(id, { w: ratio.w, h: ratio.h });
      await copyText(result.url);
      toast.success(`Fitted to ${ratio.label} — derived URL copied`);
      onChanged();
      const fresh = await fetchMediaById(id);
      setFile(fresh);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Fit failed');
    }
  };

  const isVideo = (f: MediaFile | null) => f?.mimeType?.startsWith('video/');

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Media details" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{file?.originalName || 'Media details'}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-16">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          </div>
        ) : file ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row gap-6 p-6">
              {/* Preview */}
              <div className="lg:w-1/2 shrink-0">
                <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center" style={{ maxHeight: 360 }}>
                  {isVideo(file) ? (
                    <video src={file.url} controls className="w-full max-h-[360px] object-contain bg-black" />
                  ) : (
                    <img src={file.url} alt={file.altText || file.originalName} className="max-h-[360px] w-full object-contain" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    file.width && file.height ? `${file.width}×${file.height}px` : null,
                    file.ratio ? `Detected ratio ${file.ratio}` : detectRatio(file.width, file.height) ? `Detected ratio ${detectRatio(file.width, file.height)}` : null,
                    formatBytes(file.size),
                    file.mimeType?.split('/')[1]?.toUpperCase(),
                    file.optimization?.savingsPercent ? `−${file.optimization.savingsPercent}% compressed` : null,
                  ].filter(Boolean).map((chip) => (
                    <span key={chip as string} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">{chip}</span>
                  ))}
                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">{new Date(file.uploadedAt ?? file.createdAt ?? Date.now()).toLocaleString()}</span>
                </div>

                {/* Variants */}
                {file.variants && Object.keys(file.variants).some((k) => k !== 'srcset' && (file.variants as any)[k]) && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Responsive variants</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['thumb', 'medium', 'large', 'avif'] as const).map((key) => {
                        const v = (file.variants as any)?.[key];
                        if (!v) return null;
                        return (
                          <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 uppercase">{key}</p>
                              <p className="text-[10px] text-slate-400">{v.width}×{v.height} · {formatBytes(v.size)}</p>
                            </div>
                            <button type="button" onClick={() => void copyText(v.url)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Copy variant URL">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Derived crops */}
                {file.derived && file.derived.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Fitted / cropped versions</p>
                    <div className="space-y-1.5">
                      {[...file.derived].reverse().slice(0, 5).map((d, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-700 dark:text-slate-200">
                              {d.ratio} · {d.width}×{d.height} · {d.source === 'auto' ? 'smart fit' : 'manual crop'}
                            </p>
                            <p className="text-[10px] text-slate-400">{new Date(d.createdAt).toLocaleString()}</p>
                          </div>
                          <button type="button" onClick={() => void copyText(d.url)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Copy URL">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Alt text</label>
                    <input value={alt} onChange={(e) => setAlt(e.target.value)} className="admin-input !h-9 text-xs" placeholder="Describe the image" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input !h-9 text-xs" placeholder="Optional title" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Caption</label>
                    <input value={caption} onChange={(e) => setCaption(e.target.value)} className="admin-input !h-9 text-xs" placeholder="Optional caption" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Tags</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} className="admin-input !h-9 text-xs" placeholder="comma, separated" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Folder</label>
                    <select value={folder} onChange={(e) => setFolder(e.target.value)} className="admin-input !h-9 text-xs">
                      {MEDIA_FOLDERS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setFavorite((v) => !v)} className={`admin-btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 ${favorite ? 'text-amber-600' : ''}`}>
                    <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} /> {favorite ? 'Favorited' : 'Add to favorites'}
                  </button>
                  <button type="button" onClick={() => void saveMeta()} disabled={saving} className="admin-btn-primary px-4 py-2 text-xs">
                    {saving ? 'Saving…' : 'Save details'}
                  </button>
                </div>

                {/* Usage */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <FolderInput className="w-3.5 h-3.5" /> Used in
                  </p>
                  {usage && usage.length > 0 ? (
                    <div className="space-y-2">
                      {usage.map((entry) => (
                        <div key={entry.scope}>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-medium">{SCOPE_LABELS[entry.scope] ?? entry.scope}</span> · {entry.count} {entry.count === 1 ? 'reference' : 'references'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{entry.items.map((i) => i.name).filter(Boolean).join(', ')}{entry.items.length < entry.count ? `… +${entry.count - entry.items.length}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Not referenced anywhere — safe to delete.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <label className="admin-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer">
                    <Replace className="w-3.5 h-3.5" /> Replace file
                    <input ref={fileRef} type="file" accept={ACCEPTED_IMAGE_ACCEPT} className="hidden" onChange={handleReplace} />
                  </label>
                  <button type="button" onClick={() => setVersionsOpen(true)} disabled={!file.versions?.length} className="admin-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40">
                    <History className="w-3.5 h-3.5" /> History ({file.versions?.length ?? 0})
                  </button>
                  {!isVideo(file) && (
                    <>
                      <select value={fitRatio} onChange={(e) => setFitRatio(e.target.value)} className="admin-input !w-auto !h-9 text-xs" aria-label="Fit to ratio">
                        {Object.entries(MEDIA_RATIOS).filter(([, r]) => r.w > 0).map(([key, r]) => (
                          <option key={key} value={key}>{r.label} {r.w}:{r.h}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => void handleFit()} className="admin-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Smart fit
                      </button>
                      <button type="button" onClick={() => setCropOpen(true)} className="admin-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5">
                        <span>✂️</span> Crop
                      </button>
                    </>
                  )}
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="admin-btn-ghost px-3 py-2 text-xs flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                  <button type="button" onClick={() => void copyText(file.url)} className="admin-btn-ghost px-3 py-2 text-xs flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copy URL
                  </button>
                  <a href={file.url} download className="admin-btn-ghost px-3 py-2 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button type="button" onClick={() => { if (onSafeDelete && file) { onClose(); onSafeDelete(file); } else { void deleteMedia(id, true).then(() => { toast.success('File deleted'); onChanged(); onClose(); }).catch(() => toast.error('Delete failed')); } }} className="admin-btn-ghost px-3 py-2 text-xs flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {cropOpen && file && !isVideo(file) && (
          <CropDialog
            src={file.url}
            mediaId={id}
            open={cropOpen}
            onClose={() => setCropOpen(false)}
            onApplied={() => {
              void fetchMediaById(id).then(setFile);
              onChanged();
            }}
          />
        )}
        {versionsOpen && file && <VersionsDialog file={file} onClose={() => setVersionsOpen(false)} onRestored={(updated) => { setFile(updated); onChanged(); }} />}
      </div>
    </div>
  );
}

// ===========================================================================
// Versions dialog
// ===========================================================================

function VersionsDialog({ file, onClose, onRestored }: { file: MediaFile; onClose: () => void; onRestored: (f: MediaFile) => void }) {
  const [compareUrl, setCompareUrl] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<{ fileId: string; versionId: string } | null>(null);

  return (
    <div className="fixed inset-0 z-[108] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Version history">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><History className="w-5 h-5" /> Version history</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compare */}
        {compareUrl && (
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Comparing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Current</p>
                <img src={file.url} alt="Current version" className="w-full aspect-video object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Selected version</p>
                <img src={compareUrl} alt="Selected version" className="w-full aspect-video object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Current file</p>
        <div className="flex items-center gap-3 rounded-xl border border-slate-900/20 dark:border-slate-500/40 p-3 mb-4 bg-slate-50 dark:bg-slate-800/40">
          <img src={file.url} alt="" className="w-14 h-14 object-cover rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{file.originalName}</p>
            <p className="text-[10px] text-slate-400">Now · {file.width}×{file.height} · {file.ratio ? `ratio ${file.ratio} · ` : ''}{formatBytes(file.size)}</p>
          </div>
          {compareUrl && (
            <button type="button" onClick={() => setCompareUrl(null)} className="text-[11px] text-slate-400 underline">stop compare</button>
          )}
        </div>

        {file.versions && file.versions.length > 0 ? (
          <div className="space-y-2">
            {[...file.versions].reverse().map((v) => (
              <div key={String(v._id)} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <img src={v.thumbnailUrl || v.url} alt="" className="w-14 h-14 object-cover rounded-lg bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{v.note || 'Version'}</p>
                  <p className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleString()} · {v.width}×{v.height} · {formatBytes(v.size)}</p>
                </div>
                <button type="button" onClick={() => setCompareUrl(v.url)} className="admin-btn-ghost p-2 text-[11px] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Compare
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestore({ fileId: String(file._id), versionId: String(v._id) })}
                  className="admin-btn-secondary px-3 py-1.5 text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Restore
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">No previous versions — replace the file to start a history.</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmRestore !== null}
        title="Restore version"
        body="Restore this version? The current file will be kept in history."
        confirmLabel="Restore"
        tone="primary"
        onConfirm={async () => {
          if (confirmRestore) {
            try {
              const updated = await restoreMediaVersion(confirmRestore.fileId, confirmRestore.versionId);
              onRestored(updated);
              toast.success('Version restored');
            } catch {
              toast.error('Restore failed');
            }
          }
          setConfirmRestore(null);
        }}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  );
}

// ===========================================================================
// Safe delete dialog
// ===========================================================================

function SafeDeleteDialog({ file, onCancel, onDeleteAnyway, onReplaceEverywhere }: { file: MediaFile; onCancel: () => void; onDeleteAnyway: () => void; onReplaceEverywhere: () => void }) {
  const total = (file.usage ?? []).reduce((sum, e) => sum + e.count, 0);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Image is in use" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">This image is used in {total} {total === 1 ? 'place' : 'places'}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          <span className="font-medium text-slate-700 dark:text-slate-300">{file.originalName}</span> is referenced by storefront content. Deleting it will break those images.
        </p>
        <div className="mt-4 space-y-1.5 max-h-40 overflow-y-auto">
          {(file.usage ?? []).map((entry) => (
            <div key={entry.scope} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
              <span className="text-slate-600 dark:text-slate-300">{SCOPE_LABELS[entry.scope] ?? entry.scope}</span>
              <span className="text-slate-500 dark:text-slate-400">{entry.count}×</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <button type="button" onClick={onReplaceEverywhere} className="admin-btn-primary px-4 py-2.5 text-xs flex items-center justify-center gap-2">
            <Replace className="w-4 h-4" /> Replace everywhere, then delete
          </button>
          <button type="button" onClick={onDeleteAnyway} className="admin-btn-danger px-4 py-2.5 text-xs flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete anyway
          </button>
          <button type="button" onClick={onCancel} className="admin-btn-secondary px-4 py-2.5 text-xs">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Could not copy');
  }
}
