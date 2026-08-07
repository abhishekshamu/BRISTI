import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, Maximize2, Scan, Crop, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { cropMedia, uploadFiles } from '../../services/media.service';

export interface CategoryCropResult {
  url: string;
  width: number;
  height: number;
}

interface CategoryCropDialogProps {
  src: string;
  mediaId?: string;
  folder: string;
  initialRatio?: { w: number; h: number };
  open: boolean;
  onClose: () => void;
  onApplied: (result: CategoryCropResult) => void;
}

interface ImageSize {
  w: number;
  h: number;
}

/**
 * Premium crop dialog used ONLY by the Category Edit page.
 *
 * Opens with the complete image visible (fit to screen, never auto-zoomed),
 * a crop frame centered at the required ratio, draggable image, wheel + slider
 * zoom and explicit Fit / Reset controls. The server crop and client-side
 * canvas upload logic are identical to the shared admin crop dialog.
 */
export default function CategoryCropDialog({ src, mediaId, folder = 'categories', initialRatio, open, onClose, onApplied }: CategoryCropDialogProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [stage, setStage] = useState<ImageSize>({ w: 0, h: 0 });
  const [natural, setNatural] = useState<ImageSize | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [fitted, setFitted] = useState(false);

  const ratio = useMemo(
    () => (initialRatio && initialRatio.w > 0 && initialRatio.h > 0 ? initialRatio : { w: 4, h: 5 }),
    [initialRatio]
  );
  const ratioLabel = `${ratio.w}:${ratio.h}`;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Load the image — always from a fresh, centered, fully-visible state.
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setFitted(false);
    zoomRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
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
  }, [open, src, onClose]);

  // Measure the stage.
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

  // "Fit" zoom — the complete image is visible inside the stage (100%).
  const zFit = useMemo(() => {
    if (!natural || stage.w === 0) return null;
    return Math.max(0.02, Math.min(stage.w / natural.w, stage.h / natural.h));
  }, [natural, stage]);

  // Crop frame — exact required ratio, centered. Shrinks to never exceed the
  // displayed image, so the extracted region always matches the ratio.
  const windowSize = useMemo(() => {
    if (stage.w === 0) return { w: 0, h: 0 };
    const maxW = stage.w * 0.92;
    const maxH = stage.h * 0.92;
    const aspect = ratio.w / ratio.h;
    let w = Math.min(maxW, maxH * aspect);
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    if (natural) {
      const iw = natural.w * zoom;
      const ih = natural.h * zoom;
      if (w > iw) w = iw;
      if (h > ih) {
        h = ih;
        w = h * aspect;
      } else {
        h = w / aspect;
      }
    }
    return { w, h };
  }, [stage, ratio, natural, zoom]);

  // Zoom where the image covers the crop frame (used by "Fit Image").
  const zoomCoverZ = useMemo(() => {
    if (!natural || windowSize.w === 0 || !zFit) return zFit;
    return Math.max(0.02, Math.max(windowSize.w / natural.w, windowSize.h / natural.h));
  }, [natural, zFit, windowSize]);

  const minZ = zFit ?? 1;
  const maxZ = zFit ? zFit * 8 : 8;
  const zoomPct = zFit ? Math.round((zoom / zFit) * 100) : 100;

  // Fit once the image and stage are known — the complete image is shown
  // fully visible and centered, never pre-zoomed. The user decides any zoom.
  useEffect(() => {
    if (!open || !natural || !loaded || !zFit || fitted || stage.w === 0) return;
    setZoom(zFit);
    zoomRef.current = zFit;
    setOffset({ x: 0, y: 0 });
    offsetRef.current = { x: 0, y: 0 };
    setFitted(true);
  }, [open, natural, loaded, zFit, stage.w, fitted]);

  const clampOffset = useCallback(
    (o: { x: number; y: number }, z: number) => {
      if (!natural || windowSize.w === 0) return o;
      const maxX = Math.max(0, (natural.w * z - windowSize.w) / 2);
      const maxY = Math.max(0, (natural.h * z - windowSize.h) / 2);
      return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) };
    },
    [natural, windowSize]
  );

  const applyZoom = useCallback(
    (target: number) => {
      const t = Math.min(maxZ, Math.max(minZ, target));
      const k = t / zoomRef.current;
      setZoom(t);
      setOffset((o) => clampOffset({ x: o.x * k, y: o.y * k }, t));
    },
    [maxZ, minZ, clampOffset]
  );

  const reset = useCallback(() => {
    if (!zFit) return;
    setZoom(zFit);
    setOffset({ x: 0, y: 0 });
  }, [zFit]);

  // Draggable image.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!natural || !loaded) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, zoomRef.current));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  // Mouse wheel zoom.
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    applyZoom(zoomRef.current * factor);
  };

  const imageStyle = useMemo(() => {
    if (!natural) return undefined;
    const w = natural.w * zoom;
    const h = natural.h * zoom;
    return { width: w, height: h, left: stage.w / 2 + offset.x - w / 2, top: stage.h / 2 + offset.y - h / 2 };
  }, [natural, zoom, offset, stage]);

  // Extracted region in original-image pixels (always inside the image, always the required ratio).
  const regionInfo = useMemo(() => {
    if (!natural || !loaded || windowSize.w === 0) return null;
    const winLeft = (stage.w - windowSize.w) / 2;
    const winTop = (stage.h - windowSize.h) / 2;
    const imgLeft = stage.w / 2 + offset.x - (natural.w * zoom) / 2;
    const imgTop = stage.h / 2 + offset.y - (natural.h * zoom) / 2;
    let sx = (winLeft - imgLeft) / zoom;
    let sy = (winTop - imgTop) / zoom;
    const sw = Math.max(1, Math.round(windowSize.w / zoom));
    const sh = Math.max(1, Math.round(windowSize.h / zoom));
    sx = Math.max(0, Math.min(natural.w - 1, Math.round(sx)));
    sy = Math.max(0, Math.min(natural.h - 1, Math.round(sy)));
    return { sx, sy, sw, sh };
  }, [natural, loaded, windowSize, stage, offset, zoom]);

  const applyCrop = async () => {
    if (!natural || !regionInfo) return;
    const { sx, sy, sw, sh } = regionInfo;
    setApplying(true);
    try {
      if (mediaId) {
        const result = await cropMedia(mediaId, { x: sx, y: sy, width: sw, height: sh, ratio: ratioLabel });
        onApplied({ url: result.url, width: result.width, height: result.height });
        toast.success('Crop applied');
      } else {
        // No server file backing this URL — crop client-side and upload the result.
        const canvas = document.createElement('canvas');
        const outW = Math.min(1600, sw);
        const outH = Math.max(1, Math.round((outW * sh) / sw));
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
        onApplied({ url: uploaded[0].url, width: outW, height: outH });
        toast.success('Crop saved to library');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Crop failed');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  const resolution = regionInfo ? `${regionInfo.sw}×${regionInfo.sh}` : natural ? `${natural.w}×${natural.h}` : '—';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onKeyDown={(e) => e.key === 'Escape' && !applying && onClose()}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
        {/* Top toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-50 flex items-center gap-2">
              <Scan className="w-4 h-4 text-slate-400" />
              Crop Image
            </h3>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Drag to position · scroll to zoom · nothing is applied until you confirm</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10">
              <Crop className="w-3.5 h-3.5" />
              Ratio {ratioLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10" title="Output resolution of the current crop">
              <ImageIcon className="w-3.5 h-3.5" />
              {resolution}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10">
              Zoom {zoomPct}%
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="p-2 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close crop dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          className="relative w-full overflow-hidden bg-slate-950 select-none touch-none cursor-grab active:cursor-grabbing"
          style={{ height: 'min(52vh, 520px)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={handleWheel}
        >
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
            </div>
          )}
          {loaded && natural && imageStyle && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              className="absolute block max-w-none select-none"
              style={imageStyle}
            />
          )}

          {/* Crop frame — centered, exact required ratio */}
          {loaded && windowSize.w > 0 && (
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.6)] pointer-events-none"
              style={{ left: '50%', top: '50%', width: windowSize.w, height: windowSize.h, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/40" />
                ))}
              </div>
            </div>
          )}

          {/* Zoom bar */}
          {loaded && zFit && (
            <div className="absolute bottom-3 inset-x-3 z-10 flex items-center gap-3 rounded-xl bg-slate-900/85 backdrop-blur px-4 py-2.5 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => applyZoom(zoomRef.current * 0.85)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={100}
                max={800}
                step={5}
                value={Math.min(800, Math.max(100, zoomPct))}
                onChange={(e) => zFit && applyZoom(zFit * (Number(e.target.value) / 100))}
                className="flex-1 accent-slate-100"
                aria-label="Zoom"
              />
              <span className="text-xs text-slate-300 tabular-nums w-12 text-center">{zoomPct}%</span>
              <button
                type="button"
                onClick={() => zFit && applyZoom(zFit)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Fit the complete image to the screen"
                aria-label="Fit to screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Fit screen
              </button>
              <button
                type="button"
                onClick={() => applyZoom(zoomRef.current * 1.15)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom toolbar */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 border-t border-white/10 bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={applying || !zFit}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-medium text-slate-200 bg-white/10 hover:bg-white/15 ring-1 ring-inset ring-white/10 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => zoomCoverZ && applyZoom(zoomCoverZ)}
            disabled={applying || !zoomCoverZ}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-medium text-slate-200 bg-white/10 hover:bg-white/15 ring-1 ring-inset ring-white/10 transition-colors disabled:opacity-50"
            title="Scale the image to fill the crop frame"
          >
            <Maximize2 className="w-4 h-4" />
            Fit Image
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={applying || !regionInfo}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-[13px] font-semibold bg-slate-50 text-slate-900 hover:bg-white transition-colors disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          >
            {applying ? (
              <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {applying ? 'Applying…' : 'Apply Crop'}
          </button>
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
