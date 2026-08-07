import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Rotate3d, X, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/shared/SafeImage';
import { useBrandName } from '@/context/SettingsContext';
import { getImageUrl } from '@/lib/utils';

export interface GalleryImage {
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  productId: string;
  productName: string;
  isSale: boolean;
  isNew: boolean;
  isSoldOut: boolean;
  has3D: boolean;
  viewMode: 'gallery' | '3d';
  onToggle3D: () => void;
  onRequestGallery: () => void;
  threeViewer?: React.ReactNode;
}

function ProductGalleryBase({
  images,
  productId,
  productName,
  isSale,
  isNew,
  isSoldOut,
  has3D,
  viewMode,
  onToggle3D,
  onRequestGallery,
  threeViewer,
}: ProductGalleryProps) {
  const brandName = useBrandName();
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, boolean>>({});
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  const activeRef = useRef(active);
  const imagesRef = useRef(images);
  const viewModeRef = useRef(viewMode);
  const failedRef = useRef<string[]>([]);
  const desktopScrollerRef = useRef<HTMLDivElement>(null);
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const desktopSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const desktopThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingIndexRef = useRef<number | null>(null);
  const lastIndexBefore3dRef = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const preloadedRef = useRef<Set<string>>(new Set());

  activeRef.current = active;
  imagesRef.current = images;
  viewModeRef.current = viewMode;
  failedRef.current = failedUrls;

  const showCounter = images.length > 1;
  const manyThumbs = images.length > 5;

  const resolve = useCallback((url: string): string | null => getImageUrl(url), []);

  const preload = useCallback(
    (url: string) => {
      const resolved = resolve(url);
      if (!resolved || preloadedRef.current.has(resolved)) return;
      preloadedRef.current.add(resolved);
      const img = new Image();
      img.src = resolved;
    },
    [resolve]
  );

  const markLoaded = useCallback((url: string) => {
    setLoadedUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);

  const handleError = useCallback(
    (url: string) => {
      const key = resolve(url) ?? url;
      if (failedRef.current.includes(key)) return;
      setFailedUrls((prev) => [...prev, key]);
    },
    [resolve]
  );

  const goToNext = useCallback(() => {
    setActive((a) => (imagesRef.current.length ? (a + 1) % imagesRef.current.length : 0));
  }, []);

  const goToPrev = useCallback(() => {
    setActive((a) => (imagesRef.current.length ? (a - 1 + imagesRef.current.length) % imagesRef.current.length : 0));
  }, []);

  const nextRef = useRef(goToNext);
  const prevRef = useRef(goToPrev);
  nextRef.current = goToNext;
  prevRef.current = goToPrev;

  const scrollDesktopTo = useCallback((i: number) => {
    const scroller = desktopScrollerRef.current;
    if (!scroller) return;
    const height = scroller.clientHeight || 1;
    requestAnimationFrame(() => scroller.scrollTo({ top: i * height, behavior: 'smooth' }));
  }, []);

  const scrollMobileTo = useCallback((i: number) => {
    const scroller = mobileScrollerRef.current;
    if (!scroller) return;
    const width = scroller.clientWidth || 1;
    requestAnimationFrame(() => scroller.scrollTo({ left: i * width }));
  }, []);

  const handleThumbClick = useCallback(
    (i: number, target: 'desktop' | 'mobile') => {
      if (viewModeRef.current !== 'gallery') {
        pendingIndexRef.current = i;
        onRequestGallery();
        return;
      }
      if (target === 'desktop') scrollDesktopTo(i);
      else scrollMobileTo(i);
    },
    [onRequestGallery, scrollDesktopTo, scrollMobileTo]
  );

  const openFullscreen = useCallback(() => {
    if (viewModeRef.current !== 'gallery') return;
    setFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  const handleSlideKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFullscreen();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = imagesRef.current.length;
        if (n > 1) scrollDesktopTo((activeRef.current + 1) % n);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const n = imagesRef.current.length;
        if (n > 1) scrollDesktopTo((activeRef.current - 1 + n) % n);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const n = imagesRef.current.length;
        if (n > 1) scrollMobileTo((activeRef.current + 1) % n);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = imagesRef.current.length;
        if (n > 1) scrollMobileTo((activeRef.current - 1 + n) % n);
      }
    },
    [openFullscreen, scrollDesktopTo, scrollMobileTo]
  );

  const handleModalTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 48) return;
      if (dx < 0) nextRef.current();
      else prevRef.current();
    },
    []
  );

  const renderImage = useCallback(
    (img: GalleryImage, i: number, loaded: boolean, failed: boolean) => {
      if (failed) {
        return (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">{brandName}</span>
          </div>
        );
      }
      const src = resolve(img.url);
      return (
        <>
          {!loaded && <div className="absolute inset-0 animate-pulse bg-secondary" aria-hidden="true" />}
          {src && (
            <img
              src={src}
              alt={img.alt ?? productName}
              loading={i === 0 ? 'eager' : 'lazy'}
              onLoad={() => markLoaded(src)}
              onError={() => handleError(img.url)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
            />
          )}
        </>
      );
    },
    [brandName, productName, resolve, markLoaded, handleError]
  );

  useEffect(() => {
    setActive(0);
    setLoadedUrls({});
    setFailedUrls([]);
    preloadedRef.current = new Set();
    desktopScrollerRef.current?.scrollTo({ top: 0 });
    mobileScrollerRef.current?.scrollTo({ left: 0 });
    if (images.length > 0) preload(images[0].url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (images.length === 0) return;
    preload(images[active].url);
    preload(images[(active - 1 + images.length) % images.length].url);
    preload(images[(active + 1) % images.length].url);
  }, [active, images, preload]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const scroller = desktopScrollerRef.current;
    if (!scroller) return;
    const slides = desktopSlideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index ?? 0));
          }
        }
      },
      { root: scroller, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [images.length, viewMode]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const scroller = mobileScrollerRef.current;
    if (!scroller) return;
    const slides = mobileSlideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index ?? 0));
          }
        }
      },
      { root: scroller, rootMargin: '0px -40% 0px -40%', threshold: 0 }
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [images.length, viewMode]);

  useEffect(() => {
    if (viewMode === '3d') {
      lastIndexBefore3dRef.current = activeRef.current;
    } else {
      const idx = pendingIndexRef.current ?? lastIndexBefore3dRef.current;
      pendingIndexRef.current = null;
      const desktop = desktopScrollerRef.current;
      const mobile = mobileScrollerRef.current;
      requestAnimationFrame(() => {
        if (desktop) desktop.scrollTo({ top: idx * (desktop.clientHeight || 1) });
        if (mobile) mobile.scrollTo({ left: idx * (mobile.clientWidth || 1) });
      });
    }
  }, [viewMode]);

  useEffect(() => {
    desktopThumbRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (manyThumbs) {
      mobileThumbRefs.current[active]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [active, manyThumbs]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previousFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [fullscreen, goToNext, goToPrev]);

  const current = images[active];
  const currentResolved = current ? resolve(current.url) : null;

  const badges = (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
      {isSale && <Badge variant="sale">Sale</Badge>}
      {isNew && !isSale && <Badge variant="gold">New</Badge>}
      {isSoldOut && <Badge variant="muted">Sold out</Badge>}
    </div>
  );

  const counterPill = (
    <span
      aria-live="polite"
      className="absolute right-4 top-4 z-10 flex h-8 min-w-14 items-center justify-center rounded-full bg-[var(--ice)]/90 px-3 text-xs font-medium text-foreground/70 shadow-sm"
    >
      {active + 1} / {images.length}
    </span>
  );

  const zoomButton = (
    <button
      type="button"
      onClick={openFullscreen}
      aria-label="View image in fullscreen"
      title="View fullscreen"
      className="absolute right-4 top-16 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ice)]/90 text-foreground/70 shadow-sm transition-colors hover:text-foreground"
    >
      <ZoomIn className="h-4 w-4" />
    </button>
  );

  const toggle3DButton = (
    <button
      type="button"
      onClick={onToggle3D}
      className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-foreground/90 px-4 py-2.5 text-[10px] font-medium uppercase tracking-lux-sm text-background backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Rotate3d className="h-4 w-4" />
      {viewMode === '3d' ? 'Back to photos' : 'View in 3D'}
    </button>
  );

  return (
    <div className="relative lg:sticky lg:top-36 lg:h-[calc(100vh_-_9rem)]">
      <div className="lg:hidden">
        <div
          ref={mobileScrollerRef}
          className="relative flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto bg-secondary [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: 'pan-x' }}
        >
          {viewMode === '3d' ? (
            <div className="h-full w-full shrink-0 snap-start bg-secondary">{threeViewer}</div>
          ) : images.length === 0 ? (
            <div className="flex h-full w-full shrink-0 items-center justify-center bg-secondary">
              <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">{brandName}</span>
            </div>
          ) : (
            images.map((img, i) => {
              const src = resolve(img.url);
              const loaded = src ? Boolean(loadedUrls[src]) : false;
              const failed = src ? failedUrls.includes(src) : false;
              return (
                <div
                  key={`${img.url}-${i}`}
                  ref={(el) => {
                    mobileSlideRefs.current[i] = el;
                  }}
                  data-index={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`View image ${i + 1} of ${images.length} in fullscreen`}
                  onClick={openFullscreen}
                  onKeyDown={handleSlideKeyDown}
                  className="relative h-full w-full shrink-0 cursor-zoom-in snap-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  {renderImage(img, i, loaded, failed)}
                </div>
              );
            })
          )}

          {viewMode === 'gallery' && images.length > 1 && counterPill}
          {viewMode === 'gallery' && zoomButton}
          {badges}
          {has3D && toggle3DButton}
        </div>

        {images.length > 1 && viewMode === 'gallery' && (
          <div className={`mt-4 grid grid-cols-5 gap-3 ${manyThumbs ? 'max-h-[30rem] overflow-y-auto pr-1' : ''}`}>
            {images.map((img, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    mobileThumbRefs.current[i] = el;
                  }}
                  type="button"
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleThumbClick(i, 'mobile')}
                  className={`aspect-[3/4] overflow-hidden bg-secondary transition-all focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? 'ring-1 ring-accent' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative hidden h-full lg:block">
        <div
          ref={desktopScrollerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto bg-secondary [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {viewMode === '3d' ? (
            <div className="h-full w-full snap-start bg-secondary">{threeViewer}</div>
          ) : images.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">{brandName}</span>
            </div>
          ) : (
            images.map((img, i) => {
              const src = resolve(img.url);
              const loaded = src ? Boolean(loadedUrls[src]) : false;
              const failed = src ? failedUrls.includes(src) : false;
              return (
                <div
                  key={`${img.url}-${i}`}
                  ref={(el) => {
                    desktopSlideRefs.current[i] = el;
                  }}
                  data-index={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`View image ${i + 1} of ${images.length} in fullscreen`}
                  onClick={openFullscreen}
                  onKeyDown={handleSlideKeyDown}
                  className="relative h-full w-full cursor-zoom-in snap-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  {renderImage(img, i, loaded, failed)}
                </div>
              );
            })
          )}
        </div>

        {viewMode === 'gallery' && images.length > 1 && (
          <div
            className={`absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 ${
              manyThumbs ? 'max-h-[70vh] overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''
            }`}
          >
            {images.map((img, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    desktopThumbRefs.current[i] = el;
                  }}
                  type="button"
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleThumbClick(i, 'desktop')}
                  className={`h-14 w-11 overflow-hidden bg-secondary transition-all focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? 'ring-1 ring-accent' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        {viewMode === 'gallery' && images.length > 1 && counterPill}
        {viewMode === 'gallery' && zoomButton}
        {badges}
        {has3D && toggle3DButton}
      </div>

      {createPortal(
        <AnimatePresence>
          {fullscreen && images.length > 0 && (
            <motion.div
              key="fullscreen"
              role="dialog"
              aria-modal="true"
              aria-label={`${productName} gallery`}
              className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/95"
              style={{ touchAction: 'pan-y' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) closeFullscreen();
              }}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={handleModalTouchEnd}
            >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeFullscreen}
              aria-label="Close fullscreen gallery"
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {showCounter && (
              <span aria-live="polite" className="absolute right-6 top-[4.5rem] text-xs font-medium uppercase tracking-lux-sm text-white/70">
                {active + 1} / {images.length}
              </span>
            )}

            {showCounter && (
              <>
                <button
                  type="button"
                  onClick={goToPrev}
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={active}
                src={currentResolved ?? undefined}
                alt={current?.alt ?? productName}
                onLoad={() => currentResolved && markLoaded(currentResolved)}
                onError={() => current && handleError(current.url)}
                className="max-h-[86vh] max-w-[92vw] object-contain"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                draggable={false}
              />
            </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export const ProductGallery = memo(ProductGalleryBase);
