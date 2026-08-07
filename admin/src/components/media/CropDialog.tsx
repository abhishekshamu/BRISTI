import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, ZoomIn, ZoomOut, Sparkles, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { CROP_PRESETS } from '@shared/constants';
import { detectRatio } from '@shared/utils';
import { cropMedia, fitMedia, uploadFiles } from '../../services/media.service';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: string;
}

interface CropDialogProps {
  src: string; // the original image URL to crop
  mediaId?: string; // when present, crop is non-destructive on the server
  folder?: string;
  initialRatio?: { w: number; h: number };
  open: boolean;
  onClose: () => void;
  onApplied: (result: { url: string; width: number; height: number }) => void;
}

interface ImageSize {
  w: number;
  h: number;
}

export default function CropDialog({ src, mediaId, folder = 'general', initialRatio, open, onClose, onApplied }: CropDialogProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const [natural, setNatural] = useState<ImageSize | null>(null);
  const [stage, setStage] = useState<ImageSize>({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);
  const [applying, setApplying] = useState(false);

  const [ratio, setRatio] = useState<{ w: number; h: number }>(initialRatio ?? { w: 4, h: 5 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [presetId, setPresetId] = useState<string | null>(initialRatio ? null : 'product');

  // Auto-detect the image's own aspect ratio — used to *recommend* a crop,
  // never to force one. Stored so the recommended preset stays stable.
  const naturalRatio = useMemo(() => (natural ? detectRatio(natural.w, natural.h) : null), [natural]);

  // When no caller-supplied ratio exists, default the crop window to the
  // image's natural ratio so the recommended crop is non-destructive.
  useEffect(() => {
    if (!natural || initialRatio) return;
    const detected = detectRatio(natural.w, natural.h);
    if (!detected) return;
    const [w, h] = detected.split(':').map(Number);
    if (!w || !h) return;
    setRatio({ w, h });
    const matchingPreset = CROP_PRESETS.find((p) => p.ratio && p.ratio.w / p.ratio.h === w / h);
    setPresetId(matchingPreset ? matchingPreset.id : 'original');
  }, [natural, initialRatio]);

  const windowSize = useMemo(() => {
    if (stage.w === 0) return { w: 0, h: 0 };
    const maxW = stage.w * 0.92;
    const maxH = stage.h * 0.92;
    let w = Math.min(maxW, maxH * (ratio.w / ratio.h));
    let h = w / (ratio.w / ratio.h);
    if (h > maxH) {
      h = maxH;
      w = h * (ratio.w / ratio.h);
    }
    return { w, h };
  }, [stage, ratio]);

  const windowPos = useMemo(() => ({ x: (stage.w - windowSize.w) / 2, y: (stage.h - windowSize.h) / 2 }), [stage, windowSize]);

  const reset = useCallback(() => {
    setLoaded(false);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
    };
    img.onerror = () => {
      toast.error('Could not load the image for cropping');
      onClose();
    };
    img.src = src;
  }, [open, src, onClose, reset]);

  useEffect(() => {
    if (!open || !stageRef.current) return;
    const measure = () => {
      const rect = stageRef.current!.getBoundingClientRect();
      setStage({ w: rect.width, h: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [open]);

  // Keep the image covering the crop window on zoom change.
  useEffect(() => {
    if (!natural || windowSize.w === 0) return;
    const zoomForCover = Math.max(windowSize.w / natural.w, windowSize.h / natural.h);
    setZoom((z) => Math.max(z, zoomForCover));
  }, [natural, windowSize]);

  const imageStyle = useMemo(() => {
    if (!natural) return {};
    const w = natural.w * zoom;
    const h = natural.h * zoom;
    return {
      width: w,
      height: h,
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    };
  }, [natural, zoom, offset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!natural) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const changeZoom = (delta: number) => {
    if (!natural) return;
    setZoom((z) => {
      const zoomForCover = Math.max(windowSize.w / natural.w, windowSize.h / natural.h);
      return Math.min(4, Math.max(zoomForCover, z + delta));
    });
  };

  // Zoom anchored on the centre of the crop window so the area under your
  // cursor stays put while the scale changes.
  const zoomAnchored = (factor: number) => {
    if (!natural || windowSize.w === 0) return;
    setZoom((z) => {
      const zoomForCover = Math.max(windowSize.w / natural.w, windowSize.h / natural.h);
      const next = Math.min(4, Math.max(zoomForCover, z * factor));
      if (next === z) return z;
      const cx = (windowPos.x + windowSize.w / 2 - offset.x) / z;
      const cy = (windowPos.y + windowSize.h / 2 - offset.y) / z;
      setOffset({ x: windowPos.x + windowSize.w / 2 - cx * next, y: windowPos.y + windowSize.h / 2 - cy * next });
      return next;
    });
  };

  const resetZoom = () => {
    if (!natural || windowSize.w === 0) return;
    setZoom(Math.max(windowSize.w / natural.w, windowSize.h / natural.h));
    setOffset({ x: 0, y: 0 });
  };

  const nudge = (dx: number, dy: number) => {
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };

  // Keyboard controls: arrows nudge the crop, +/- zoom, 0 resets to fit,
  // Escape dismisses. Inputs keep their default behaviour.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (applying) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (!loaded) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); nudge(0, 10); break;
        case 'ArrowDown': e.preventDefault(); nudge(0, -10); break;
        case 'ArrowLeft': e.preventDefault(); nudge(-10, 0); break;
        case 'ArrowRight': e.preventDefault(); nudge(10, 0); break;
        case '+': case '=': e.preventDefault(); zoomAnchored(1.2); break;
        case '-': case '_': e.preventDefault(); zoomAnchored(1 / 1.2); break;
        case '0': e.preventDefault(); resetZoom(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Mouse-wheel zoom, anchored on the crop window centre. Attached directly
  // with { passive: false } so preventDefault works reliably.
  useEffect(() => {
    if (!open || !stageRef.current) return;
    const el = stageRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!loaded) return;
      zoomAnchored(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  // Live preview of the final crop — mirrors the stage math so what you see
  // here is exactly what gets saved.
  const preview = useMemo(() => {
    if (!natural || windowSize.w === 0 || !loaded) return null;
    const previewW = 200;
    const scale = previewW / windowSize.w;
    return {
      previewW,
      previewH: (previewW * windowSize.h) / windowSize.w,
      imgW: natural.w * zoom * scale,
      imgH: natural.h * zoom * scale,
      tx: (offset.x - windowPos.x) * scale,
      ty: (offset.y - windowPos.y) * scale,
    };
  }, [natural, loaded, zoom, offset, windowSize, windowPos]);

  const applyCrop = async () => {
    if (!natural || windowSize.w === 0) return;
    const sx = (windowPos.x - offset.x) / zoom;
    const sy = (windowPos.y - offset.y) / zoom;
    const sw = windowSize.w / zoom;
    const sh = windowSize.h / zoom;
    const region = {
      x: Math.max(0, Math.min(natural.w - 1, Math.round(sx))),
      y: Math.max(0, Math.min(natural.h - 1, Math.round(sy))),
      width: Math.max(1, Math.round(Math.min(sw, natural.w - sx))),
      height: Math.max(1, Math.round(Math.min(sh, natural.h - sy))),
    };
    const ratioLabel = `${ratio.w}:${ratio.h}`;
    setApplying(true);
    try {
      if (mediaId) {
        const result = await cropMedia(mediaId, { ...region, ratio: ratioLabel });
        onApplied({ url: result.url, width: result.width, height: result.height });
        toast.success('Crop applied');
      } else {
        // No server file backing this URL — crop client-side and upload the result.
        const canvas = document.createElement('canvas');
        const outW = Math.min(1600, sw);
        const outH = Math.round(outW / (sw / sh));
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        const image = imgRef.current ?? (await loadImage(src));
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
        if (!blob) throw new Error('Could not generate the cropped image');
        const file = new File([blob], 'crop.webp', { type: 'image/webp' });
        const uploaded = await uploadFiles([file], { folder });
        const media = uploaded[0];
        onApplied({ url: media.url, width: outW, height: outH });
        toast.success('Crop saved to library');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Crop failed');
    } finally {
      setApplying(false);
    }
  };

  const autoFit = async () => {
    if (!mediaId) {
      toast('Crop this image manually, or upload it through the picker to enable smart fit', { icon: '💡' });
      return;
    }
    setApplying(true);
    try {
      const result = await fitMedia(mediaId, ratio);
      onApplied({ url: result.url, width: result.width, height: result.height });
      toast.success('Smart fit applied — subject centered');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Smart fit failed');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onKeyDown={(e) => e.key === 'Escape' && !applying && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Crop image</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Drag to position, use the slider to zoom — cropping is never applied automatically</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close crop dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets — recommendations only, never forced */}
        <div className="flex flex-wrap gap-2 px-6 pt-4">
          {naturalRatio && (
            <button
              type="button"
              onClick={() => {
                const [w, h] = naturalRatio.split(':').map(Number);
                setRatio({ w, h });
                setPresetId('original');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                presetId === 'original'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
              }`}
              title={`Keep the image's detected ratio (${naturalRatio}) — non-destructive`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              Keep original {naturalRatio}
              <span className="text-[10px] uppercase tracking-wide opacity-80">Recommended</span>
            </button>
          )}
          {CROP_PRESETS.map((preset) => {
            const recommended =
              preset.ratio &&
              naturalRatio &&
              preset.ratio.w / preset.ratio.h === Number(naturalRatio.split(':')[0]) / Number(naturalRatio.split(':')[1]);
            return (
              <span key={preset.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (preset.ratio) {
                      setRatio(preset.ratio);
                      setPresetId(preset.id);
                    } else {
                      setPresetId('custom');
                      toast('Choose a ratio in the custom fields below', { icon: '🎨' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 relative ${
                    presetId === preset.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                  {recommended && presetId !== 'original' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Recommended — matches the detected ratio" />
                  )}
                </button>
              </span>
            );
          })}
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              min={1}
              max={99}
              value={ratio.w}
              onChange={(e) => setRatio((r) => ({ ...r, w: Math.max(1, Number(e.target.value) || 1) }))}
              className="admin-input !h-8 !w-14 !px-2 text-center"
              aria-label="Ratio width"
            />
            <span className="text-slate-400 text-xs">:</span>
            <input
              type="number"
              min={1}
              max={99}
              value={ratio.h}
              onChange={(e) => setRatio((r) => ({ ...r, h: Math.max(1, Number(e.target.value) || 1) }))}
              className="admin-input !h-8 !w-14 !px-2 text-center"
              aria-label="Ratio height"
            />
          </div>
        </div>

        {/* Stage + live preview */}
        <div className="px-6 py-4 flex gap-5">
          <div className="min-w-0 flex-1">
            <div
              ref={stageRef}
              className="relative w-full overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center select-none touch-none"
              style={{ height: 'min(480px, 55vh)' }}
            >
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
                </div>
              )}
              {loaded && natural && (
                <div
                  className="absolute"
                  style={{ ...imageStyle, left: stage.w / 2, top: stage.h / 2, marginLeft: -imageStyle.width! / 2, marginTop: -imageStyle.height! / 2 }}
                >
                  <img ref={imgRef} src={src} alt="" draggable={false} className="block max-w-none select-none" style={{ width: natural.w * zoom, height: natural.h * zoom }} />
                </div>
              )}
              {loaded && windowSize.w > 0 && (
                <div
                  className="absolute border-2 border-white cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{ left: windowPos.x, top: windowPos.y, width: windowSize.w, height: windowSize.h, touchAction: 'none' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/30" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 mt-3">
              <button type="button" onClick={() => changeZoom(-0.25)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Math.max(0.1, Number(e.target.value)))}
                className="flex-1 accent-slate-900 dark:accent-slate-100"
                aria-label="Zoom"
              />
              <button type="button" onClick={() => changeZoom(0.2)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Scroll or {`+`}/{`-`} to zoom · drag the crop window to position · arrows nudge · 0 resets
            </p>
          </div>

          <div className="hidden md:flex flex-col gap-2 w-[200px] shrink-0">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Live preview</span>
            <div
              className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center"
              style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}
            >
              {!preview && (
                <span className="text-[11px] text-slate-500 px-3 text-center">Waiting for image…</span>
              )}
              {preview && (
                <img
                  src={src}
                  alt="Crop preview"
                  draggable={false}
                  className="absolute top-0 left-0 max-w-none"
                  style={{ width: preview.imgW, height: preview.imgH, transform: `translate(${preview.tx}px, ${preview.ty}px)` }}
                />
              )}
            </div>
            <span className="text-[11px] text-slate-500 tabular-nums">{ratio.w}:{ratio.h}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={autoFit}
            disabled={applying}
            className="admin-btn-ghost text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart auto-fit
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={applying} className="admin-btn-secondary px-4 py-2 text-xs">
              Cancel
            </button>
            <button type="button" onClick={applyCrop} disabled={applying} className="admin-btn-primary px-5 py-2 text-xs flex items-center gap-1.5">
              {applying ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin dark:border-slate-600 dark:border-t-slate-200" /> : <Check className="w-3.5 h-3.5" />}
              {applying ? 'Applying…' : 'Apply crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}
