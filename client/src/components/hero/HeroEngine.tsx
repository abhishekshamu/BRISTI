import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { heroService } from '@/services/hero.service';
import { HeroSection } from '@/components/home/HeroSection';
import { useHeroLive } from '@/hooks/useHeroLive';
import type { HeroBlock, HeroSlide } from '@shared/types';

const HOLD_MS = 4500;
const DEFAULT_SPEED = 0.7;
const PANELS_PER_VIEW = { desktop: 5, tablet: 3, mobile: 1 } as const;
type ViewportKey = keyof typeof PANELS_PER_VIEW;

function isFineHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function slideHref(slide: HeroSlide): string | undefined {
  if (!slide?.ctaLink) return undefined;
  if (slide.ctaLinkType === 'collection') return `/collection/${slide.ctaLink}`;
  if (slide.ctaLinkType === 'category') return `/shop?category=${slide.ctaLink}`;
  if (slide.ctaLinkType === 'product') return `/product/${slide.ctaLink}`;
  return slide.ctaLink;
}

function visibleFor(viewport: ViewportKey, slide: HeroSlide): boolean {
  const visibility = slide.visibility;
  if (!visibility) return true;
  if (viewport === 'mobile') return visibility.mobile !== false;
  if (viewport === 'tablet') return visibility.tablet !== false;
  return visibility.desktop !== false;
}

interface StripPanelProps {
  slide: HeroSlide;
  index: number;
  inView: boolean;
  isMobile: boolean;
  viewport: ViewportKey;
  setName: string;
}

function StripPanel({ slide, index, inView, isMobile, viewport, setName }: StripPanelProps) {
  const image = isMobile ? slide.imageMobile || slide.image : slide.image;
  const video = isMobile ? slide.videoMobile || slide.video : slide.video;
  const videoRef = useRef<HTMLVideoElement>(null);
  const href = slideHref(slide);
  const textColor = slide.headingColor || '#FFFFFF';
  const buttonColor = slide.buttonColor || 'var(--accent, #c9a227)';
  const textAlign = slide.textAlign ?? 'left';
  const alignStyle: CSSProperties =
    textAlign === 'center'
      ? { alignItems: 'center', textAlign: 'center' }
      : textAlign === 'right'
        ? { alignItems: 'flex-end', textAlign: 'right' }
        : { alignItems: 'flex-start', textAlign: 'left' };
  const altText = slide.altText || slide.heading || `${setName} slide ${index + 1}`;
  const zoom = (slide.animationType ?? 'zoom') === 'zoom';

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => undefined);
    else v.pause();
  }, [inView]);

  return (
    <div className="hero-panel" role="group" aria-label={altText}>
      <div className="hero-panel__stage" style={slide.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}>
        <div className={`hero-panel__slide hero-panel__anim--${slide.animationType ?? 'zoom'}`}>
          <div className="hero-panel__shimmer" aria-hidden="true" />
          {image ? (
            <img
              src={image}
              alt={altText}
              loading={index < PANELS_PER_VIEW[viewport] ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className={`hero-panel__media ${inView && zoom ? 'hero-panel__kenburns' : ''}`}
            />
          ) : null}
          {video ? (
            <video
              ref={videoRef}
              src={video}
              muted
              loop
              playsInline
              preload="metadata"
              className={`hero-panel__media ${inView && zoom ? 'hero-panel__kenburns' : ''}`}
              aria-hidden="true"
            />
          ) : null}
        </div>
        {slide.overlay ? (
          <div
            className="hero-panel__overlay"
            style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.9, Math.max(0, Number(slide.overlayOpacity ?? 45)) / 100)})` }}
            aria-hidden="true"
          />
        ) : null}
        {slide.gradient ? <div className="hero-panel__gradient" aria-hidden="true" /> : null}
      </div>

      <div className={`hero-panel__content${inView ? ' hero-panel__content--enter' : ''}`} style={{ color: textColor, ...alignStyle }}>
        {slide.showEyebrow && slide.eyebrow ? (
          <span className="hero-panel__eyebrow" style={{ color: 'var(--accent)' }}>
            <span className="hero-panel__eyebrow-rule" aria-hidden="true" />
            {slide.eyebrow}
          </span>
        ) : null}
        {slide.heading ? <h2 className="hero-panel__title">{slide.heading}</h2> : null}
        {slide.description ? <p className="hero-panel__description">{slide.description}</p> : null}
        {slide.showCta && (slide.ctaText || slide.secondaryButtonText) ? (
          <div className="hero-panel__cta-wrap">
            {slide.showCta && slide.ctaText && href ? (
              href.startsWith('/') ? (
                <Link to={href} className="hero-panel__cta hero-panel__cta--primary" style={{ backgroundColor: buttonColor }} onClick={(e) => e.stopPropagation()}>
                  {slide.ctaText}
                </Link>
              ) : (
                <a href={href} target="_blank" rel="noreferrer" className="hero-panel__cta hero-panel__cta--primary" style={{ backgroundColor: buttonColor }} onClick={(e) => e.stopPropagation()}>
                  {slide.ctaText}
                </a>
              )
            ) : null}
            {slide.secondaryButtonText && slide.secondaryButtonLink ? (
              slide.secondaryButtonLink.startsWith('/') ? (
                <Link to={slide.secondaryButtonLink} className="hero-panel__cta hero-panel__cta--ghost" onClick={(e) => e.stopPropagation()}>
                  {slide.secondaryButtonText}
                </Link>
              ) : (
                <a href={slide.secondaryButtonLink} target="_blank" rel="noreferrer" className="hero-panel__cta hero-panel__cta--ghost" onClick={(e) => e.stopPropagation()}>
                  {slide.secondaryButtonText}
                </a>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HeroEngine() {
  const queryClient = useQueryClient();
  useHeroLive(queryClient);

  const { data } = useQuery({
    queryKey: ['hero', 'active'],
    queryFn: heroService.getActive,
    staleTime: 0,
    refetchInterval: 30000,
  });
  const sets = data ?? [];
  const set = sets[0] as HeroBlock | undefined;

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(max-width: 1023px)');
  const viewport: ViewportKey = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const blocks = useMemo(() => {
    if (!set?.slides) return [];
    return set.slides
      .map((s, i) => ({ slide: s, order: s.priority ?? i }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.slide)
      .filter((s) => visibleFor(viewport, s));
  }, [set, viewport]);

  const k = PANELS_PER_VIEW[viewport];
  const n = blocks.length;
  const trackItems = useMemo(() => {
    if (n === 0) return [];
    const before = blocks.slice(-k);
    const after = blocks.slice(0, k);
    return [...before, ...blocks, ...after];
  }, [blocks, k, n]);
  const clampIndex = (i: number) => Math.max(k, Math.min(k + n - 1, i));

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<number>(k);
  const panelWRef = useRef(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, baseX: 0, moved: false });
  const timerRef = useRef<number | undefined>(undefined);
  const tweensRef = useRef<gsap.core.Tween | null>(null);
  const blockIdsRef = useRef<string[]>([]);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const kRef = useRef<number>(k);
  kRef.current = k;
  const [activeIdx, setActiveIdx] = useState(0);
  const [inViewMap, setInViewMap] = useState<Record<string, boolean>>({});

  const measure = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    panelWRef.current = el.clientWidth / kRef.current;
    gsap.set(trackRef.current, { x: -iRef.current * panelWRef.current, force3D: true });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (pausedRef.current) return;
    const kk = kRef.current;
    const nCur = blocksRef.current.length;
    if (nCur <= kk) return;
    timerRef.current = window.setTimeout(() => {
      const i = iRef.current + 1;
      iRef.current = i;
      setActiveIdx((i - kk + nCur) % nCur);
      const duration = Math.min(2, Math.max(0.4, blocksRef.current[(i - kk + nCur) % nCur]?.animationSpeed ?? blocksRef.current[0]?.animationSpeed ?? DEFAULT_SPEED));
      tweensRef.current?.kill();
      tweensRef.current = gsap.to(trackRef.current, {
        x: -i * panelWRef.current,
        duration,
        ease: 'power2.inOut',
        force3D: true,
        onComplete: () => {
          if (i === kk + nCur) {
            iRef.current = kk;
            gsap.set(trackRef.current, { x: -kk * panelWRef.current, force3D: true });
            setActiveIdx(0);
          }
          scheduleNext();
        },
      });
    }, HOLD_MS);
  }, [clearTimer]);

  const jumpTo = useCallback(
    (blockIndex: number) => {
      if (n <= 0) return;
      const target = clampIndex(k + blockIndex);
      clearTimer();
      tweensRef.current?.kill();
      iRef.current = target;
      setActiveIdx(blockIndex % n);
      gsap.to(trackRef.current, {
        x: -target * panelWRef.current,
        duration: Math.min(2, Math.max(0.4, blocksRef.current[blockIndex % n]?.animationSpeed ?? DEFAULT_SPEED)),
        ease: 'power2.inOut',
        force3D: true,
      });
      scheduleNext();
    },
    [clearTimer, k, n]
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(
      (entries) => {
        const inView = entries[0] ? entries[0].isIntersecting : true;
        if (!inView) {
          pausedRef.current = true;
          clearTimer();
        } else if (!pausedRef.current) {
          scheduleNext();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        clearTimer();
      } else {
        pausedRef.current = false;
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
      tweensRef.current?.kill();
    };
  }, [clearTimer, measure, scheduleNext]);

  useEffect(() => {
    const ids = blocks.map((b) => String(b._id));
    const same = ids.length === blockIdsRef.current.length && ids.every((id, idx) => id === blockIdsRef.current[idx]);
    blockIdsRef.current = ids;
    if (same) return;
    if (ids.length === 0) {
      iRef.current = kRef.current;
      return;
    }
    clearTimer();
    tweensRef.current?.kill();
    iRef.current = kRef.current;
    setActiveIdx(0);
    measure();
    scheduleNext();
  }, [blocks, clearTimer, measure, scheduleNext]);

  useEffect(() => {
    setInViewMap({});
  }, [viewport, k, n]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewportRef.current !== 'mobile') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    draggingRef.current = true;
    pausedRef.current = true;
    clearTimer();
    tweensRef.current?.kill();
    dragStartRef.current = { x: e.clientX, baseX: -iRef.current * panelWRef.current, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - dragStartRef.current.x;
    if (!dragStartRef.current.moved && Math.abs(delta) < 6) return;
    dragStartRef.current.moved = true;
    gsap.set(trackRef.current, { x: dragStartRef.current.baseX + delta, force3D: true });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = dragStartRef.current.moved ? e.clientX - dragStartRef.current.x : 0;
    draggingRef.current = false;
    pausedRef.current = false;
    const i = iRef.current;
    const width = panelWRef.current;
    if (Math.abs(delta) > width * 0.25) {
      const target = clampIndex(delta < 0 ? i + 1 : i - 1);
      iRef.current = target;
      const kk = kRef.current;
      const nCur = blocksRef.current.length;
      setActiveIdx((target - kk + nCur) % nCur);
      gsap.to(trackRef.current, {
        x: -target * width,
        duration: 0.45,
        ease: 'power2.out',
        force3D: true,
      });
    } else {
      gsap.to(trackRef.current, { x: -i * width, duration: 0.35, ease: 'power2.out', force3D: true });
    }
    scheduleNext();
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const hoverable = isFineHover();
    const onEnter = () => {
      if (hoverable) {
        pausedRef.current = true;
        clearTimer();
      }
    };
    const onLeave = () => {
      if (hoverable) {
        pausedRef.current = false;
        scheduleNext();
      }
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [clearTimer, scheduleNext]);

  useEffect(() => {
    if (!trackRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        setInViewMap((prev) => {
          const next = { ...prev };
          for (const entry of entries) {
            const panelKey = entry.target.getAttribute('data-panel');
            if (panelKey !== null) next[panelKey] = entry.isIntersecting;
          }
          return next;
        });
      },
      { root: sectionRef.current, threshold: 0.01 }
    );
    const els = trackRef.current.querySelectorAll('[data-panel]');
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [trackItems.length, k, viewport, n]);

  if (n === 0) return <HeroSection />;

  const name = set?.name ?? 'Featured';

  return (
    <section
      ref={sectionRef}
      className={`hero-engine hero-engine--${viewport}`}
      aria-label={name}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={() => {
        pausedRef.current = true;
        clearTimer();
      }}
      onTouchEnd={() => {
        pausedRef.current = false;
        scheduleNext();
      }}
    >
      <div ref={trackRef} className="hero-strip" style={{ willChange: 'transform' }}>
        {trackItems.map((slide, idx) => (
          <div key={`${String(slide._id)}-${idx}`} data-panel={idx} className="hero-panel-slot">
            <StripPanel
              slide={slide}
              index={idx}
              inView={inViewMap[idx] ?? false}
              isMobile={isMobile}
              viewport={viewport}
              setName={name}
            />
          </div>
        ))}
      </div>
      {n > k ? (
        <div className="hero-panel__dashes" role="tablist" aria-label={`${name} slides`}>
          {blocks.map((b, i) => (
            <button
              key={String(b._id ?? i)}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`Slide ${i + 1}`}
              className={`hero-panel__dash${i === activeIdx ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
