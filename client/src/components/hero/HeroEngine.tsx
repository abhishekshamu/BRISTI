import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { heroService } from '@/services/hero.service';
import { HeroSection } from '@/components/home/HeroSection';
import { useHeroLive } from '@/hooks/useHeroLive';
import type { HeroBlock, HeroSlide } from '@shared/types';

/* gsap >= 3.13 ships ModifiersPlugin merged into gsap-core; the `modifiers`
   config below is active without a separate registration step. */

const DEFAULT_HOLD = 0.7;
const DRIFT_MS_PER_SEAT = 2400;
const STEP_MS = 550;
const SNAP_MS = 380;
const JUMP_MS = 700;

type ViewportKey = 'desktop' | 'tablet' | 'mobile';

const SLOTS: Record<ViewportKey, Array<{ kind: 'preview' | 'main' }>> = {
  desktop: [{ kind: 'preview' }, { kind: 'main' }, { kind: 'main' }, { kind: 'preview' }],
  tablet: [{ kind: 'preview' }, { kind: 'main' }, { kind: 'preview' }],
  mobile: [{ kind: 'main' }],
};

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

interface SeatCardProps {
  slide: HeroSlide;
  seatIdx: number;
  isActive: boolean;
  inView: boolean;
  isMobile: boolean;
  viewport: ViewportKey;
  setName: string;
}

function SeatCard({ slide, seatIdx, isActive, inView, isMobile, viewport, setName }: SeatCardProps) {
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
  const altText = slide.altText || slide.heading || `${setName} slide ${seatIdx + 1}`;
  const zoom = (slide.animationType ?? 'zoom') === 'zoom';
  const eagerCount = SLOTS[viewport].length;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) v.play().catch(() => undefined);
    else v.pause();
  }, [inView]);

  return (
    <div className="hx-card" role="group" aria-label={altText}>
      <div className="hx-card__stage" style={slide.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}>
        <div className="hx-card__slide">
          <div className="hx-card__shimmer" aria-hidden="true" />
          {image ? (
            <img
              src={image}
              alt={altText}
              loading={seatIdx < eagerCount ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className={`hx-card__media${inView && zoom ? ' hx-card__kenburns' : ''}`}
              onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
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
              className="hx-card__media"
              onLoadedData={(e) => e.currentTarget.classList.add('is-loaded')}
              aria-hidden="true"
            />
          ) : null}
        </div>
        {slide.overlay ? (
          <div
            className="hx-card__overlay"
            style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.9, Math.max(0, Number(slide.overlayOpacity ?? 45) / 100))})` }}
            aria-hidden="true"
          />
        ) : null}
        {slide.gradient ? <div className="hx-card__gradient" aria-hidden="true" /> : null}
      </div>

      <div
        key={isActive ? 'on' : 'off'}
        className={`hx-card__content${isActive ? ' hx-card__content--on' : ''}${inView ? ' hx-card__content--in' : ''}`}
        data-seat-content
        data-seat-index={seatIdx}
        style={{ color: textColor, ...alignStyle }}
      >
        {slide.showEyebrow && slide.eyebrow ? (
          <span className="hx-card__eyebrow" style={{ color: 'var(--accent)' }}>
            <span className="hx-card__eyebrow-rule" aria-hidden="true" />
            {slide.eyebrow}
          </span>
        ) : null}
        {slide.heading ? <h2 className="hx-card__title">{slide.heading}</h2> : null}
        {slide.description ? <p className="hx-card__description">{slide.description}</p> : null}
        {slide.showCta && (slide.ctaText || slide.secondaryButtonText) ? (
          <div className="hx-card__cta-wrap">
            {slide.showCta && slide.ctaText && href ? (
              href.startsWith('/') ? (
                <Link to={href} className="hx-card__cta hx-card__cta--primary" style={{ backgroundColor: buttonColor }} onClick={(e) => e.stopPropagation()}>
                  {slide.ctaText}
                </Link>
              ) : (
                <a href={href} target="_blank" rel="noreferrer" className="hx-card__cta hx-card__cta--primary" style={{ backgroundColor: buttonColor }} onClick={(e) => e.stopPropagation()}>
                  {slide.ctaText}
                </a>
              )
            ) : null}
            {slide.secondaryButtonText && slide.secondaryButtonLink ? (
              slide.secondaryButtonLink.startsWith('/') ? (
                <Link to={slide.secondaryButtonLink} className="hx-card__cta hx-card__cta--ghost" onClick={(e) => e.stopPropagation()}>
                  {slide.secondaryButtonText}
                </Link>
              ) : (
                <a href={slide.secondaryButtonLink} target="_blank" rel="noreferrer" className="hx-card__cta hx-card__cta--ghost" onClick={(e) => e.stopPropagation()}>
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

  const slots = SLOTS[viewport];
  const k = slots.length;
  const n = blocks.length;
  const mainJs = useMemo(() => slots.map((s, i) => (s.kind === 'main' ? i : -1)).filter((i) => i >= 0), [slots]);
  const rightJ = mainJs[mainJs.length - 1] ?? 0;

  const seats = useMemo(() => {
    if (n === 0) return [];
    return Array.from({ length: n + k }, (_, s) => blocks[s % n]);
  }, [blocks, n, k]);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const busRef = useRef<gsap.core.Tween | null>(null);
  const stepTweenRef = useRef<gsap.core.Tween | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const wheelTimerRef = useRef<number | undefined>(undefined);
  const widthRef = useRef(0);
  const landingRef = useRef(0);
  const nRef = useRef(n);
  nRef.current = n;
  const kRef = useRef(k);
  kRef.current = k;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const mainJsRef = useRef(mainJs);
  mainJsRef.current = mainJs;
  const rightJRef = useRef(rightJ);
  rightJRef.current = rightJ;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const setRef = useRef(set);
  setRef.current = set;
  const holdRef = useRef<number>(DEFAULT_HOLD);
  const pausedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const reducedRef = useRef(false);
  const retriedRef = useRef(false);
  const gateKeyRef = useRef('');
  const dragRef = useRef({ x: 0, baseX: 0, moved: false });

  const [gate, setGate] = useState<{ on: number[]; active: number }>({ on: [], active: 0 });
  const [inViewMap, setInViewMap] = useState<Record<number, boolean>>({});
  const [retryTick, setRetryTick] = useState(0);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    widthRef.current = el.clientWidth / kRef.current;
  }, []);

  const trackW = useCallback(() => widthRef.current, []);

  const syncBus = useCallback((p: number) => {
    const bus = busRef.current;
    const nCur = nRef.current;
    if (!bus || nCur < 1) return;
    bus.progress(1 - ((((p % nCur) + nCur) % nCur) / nCur));
  }, []);

  const currentP = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const W = trackW();
    if (!W) return 0;
    return -((gsap.getProperty(track, 'x') as number) / W);
  }, [trackW]);

  const updateGate = useCallback(() => {
    const nCur = nRef.current;
    if (!nCur) return;
    const p = currentP();
    const on = mainJsRef.current.map((j) => ((Math.floor(p + j + 0.5) % nCur) + nCur) % nCur);
    const active = ((Math.floor(p + rightJRef.current + 0.5) % nCur) + nCur) % nCur;
    const key = `${on.join(',')}|${active}`;
    if (key === gateKeyRef.current) return;
    gateKeyRef.current = key;
    setGate({ on, active });
    holdRef.current = blocksRef.current[active]?.animationSpeed ?? setRef.current?.animationSpeed ?? DEFAULT_HOLD;
  }, [currentP]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const resumeBus = useCallback(() => {
    if (scrubbingRef.current) return;
    if (stepTweenRef.current?.isActive()) return;
    busRef.current?.resume();
  }, []);

  const scheduleStep = useCallback(() => {
    clearTimer();
    if (reducedRef.current) return;
    if (pausedRef.current || scrubbingRef.current) return;
    if (nRef.current <= 1) return;
    timerRef.current = window.setTimeout(runStepRef.current, holdRef.current * 1000);
  }, [clearTimer]);

  const runStep = useCallback(() => {
    const track = trackRef.current;
    const bus = busRef.current;
    const nCur = nRef.current;
    if (!track || !bus || nCur <= 1) return;
    bus.pause();
    const W = trackW();
    if (!W) {
      bus.resume();
      scheduleStep();
      return;
    }
    const target = (((landingRef.current - 1) % nCur) + nCur) % nCur;
    landingRef.current = target;
    stepTweenRef.current?.kill();
    stepTweenRef.current = gsap.to(track, {
      x: -target * W,
      duration: STEP_MS / 1000,
      ease: 'power2.inOut',
      force3D: true,
      onComplete: () => {
        gsap.set(track, { x: -target * W, force3D: true });
        syncBus(target);
        updateGate();
        resumeBus();
        if (!pausedRef.current && !scrubbingRef.current) scheduleStep();
      },
    });
  }, [resumeBus, scheduleStep, syncBus, trackW, updateGate]);

  const runStepRef = useRef(runStep);
  runStepRef.current = runStep;

  const jumpTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const bus = busRef.current;
      const nCur = nRef.current;
      if (!track || nCur <= 0) return;
      const i = ((index % nCur) + nCur) % nCur;
      const target = (((i - rightJRef.current) % nCur) + nCur) % nCur;
      landingRef.current = target;
      const W = trackW();
      if (!W) return;
      clearTimer();
      stepTweenRef.current?.kill();
      bus?.pause();
      if (reducedRef.current) {
        gsap.set(track, { x: -target * W, force3D: true });
        syncBus(target);
        updateGate();
        return;
      }
      stepTweenRef.current = gsap.to(track, {
        x: -target * W,
        duration: JUMP_MS / 1000,
        ease: 'power3.inOut',
        force3D: true,
        onComplete: () => {
          gsap.set(track, { x: -target * W, force3D: true });
          syncBus(target);
          updateGate();
          resumeBus();
          if (!pausedRef.current && !scrubbingRef.current) scheduleStep();
        },
      });
    },
    [clearTimer, resumeBus, scheduleStep, syncBus, trackW, updateGate]
  );

  const beginScrub = useCallback(() => {
    if (scrubbingRef.current) return;
    if (reducedRef.current || nRef.current <= 1) return;
    scrubbingRef.current = true;
    clearTimer();
    stepTweenRef.current?.kill();
    busRef.current?.pause();
  }, [clearTimer]);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    const track = trackRef.current;
    if (!track) return;
    const W = trackW();
    if (!W) return;
    const nCur = nRef.current;
    const p = currentP();
    const snapped = ((Math.round(p) % nCur) + nCur) % nCur;
    landingRef.current = snapped;
    stepTweenRef.current?.kill();
    stepTweenRef.current = gsap.to(track, {
      x: -snapped * W,
      duration: SNAP_MS / 1000,
      ease: 'power2.out',
      force3D: true,
      onComplete: () => {
        gsap.set(track, { x: -snapped * W, force3D: true });
        syncBus(snapped);
        updateGate();
        resumeBus();
        if (!pausedRef.current) scheduleStep();
      },
    });
  }, [currentP, resumeBus, scheduleStep, syncBus, trackW, updateGate]);

  useEffect(() => {
    measure();
    const el = sectionRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || n === 0) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;
    stepTweenRef.current?.kill();
    stepTweenRef.current = null;
    clearTimer();
    if (reduced || n <= 1) {
      gsap.set(track, { x: 0, force3D: true });
      landingRef.current = 0;
      updateGate();
      return;
    }
    measure();
    const W = trackW();
    if (!W) {
      if (!retriedRef.current) {
        retriedRef.current = true;
        const t = window.setTimeout(() => {
          retriedRef.current = false;
          setRetryTick((x) => x + 1);
        }, 250);
        return () => window.clearTimeout(t);
      }
      return;
    }
    const nCur = n;
    const initP = Math.max(0, nCur - 2);
    landingRef.current = initP;
    gsap.set(track, { x: -initP * W, force3D: true });
    const bus = gsap.to(track, {
      x: 0,
      duration: (DRIFT_MS_PER_SEAT * nCur) / 1000,
      ease: 'none',
      repeat: -1,
      force3D: true,
      modifiers: {
        x: (_raw: number, tween: gsap.core.Tween) => (tween.progress() - 1) * nCur * trackW(),
      },
    });
    busRef.current = bus;
    bus.progress(1 - initP / nCur);
    updateGate();
    scheduleStep();
    return () => {
      bus.kill();
      if (busRef.current === bus) busRef.current = null;
    };
  }, [n, k, viewport, retryTick, clearTimer, measure, scheduleStep, trackW, updateGate]);

  useEffect(() => {
    gsap.ticker.add(updateGate);
    return () => gsap.ticker.remove(updateGate);
  }, [updateGate]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting ?? true;
        if (inView) {
          pausedRef.current = false;
          resumeBus();
          scheduleStep();
        } else {
          pausedRef.current = true;
          clearTimer();
          stepTweenRef.current?.kill();
          busRef.current?.pause();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        clearTimer();
        stepTweenRef.current?.kill();
        busRef.current?.pause();
      } else {
        pausedRef.current = false;
        resumeBus();
        scheduleStep();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearTimer, resumeBus, scheduleStep]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX);
      const dy = Math.abs(e.deltaY);
      if (!(dx > 4 && dx >= dy)) return;
      e.preventDefault();
      const track = trackRef.current;
      if (!track || nRef.current <= 1 || reducedRef.current) return;
      if (!scrubbingRef.current) beginScrub();
      const W = trackW();
      if (!W) return;
      const x = gsap.getProperty(track, 'x') as number;
      const next = Math.max(-nRef.current * W, Math.min(0, x + e.deltaX));
      gsap.set(track, { x: next, force3D: true });
      updateGate();
      if (wheelTimerRef.current !== undefined) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => endScrub(), 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelTimerRef.current !== undefined) window.clearTimeout(wheelTimerRef.current);
    };
  }, [beginScrub, endScrub, trackW, updateGate]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewportRef.current !== 'mobile') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const track = trackRef.current;
    if (!track || nRef.current <= 1 || reducedRef.current) return;
    beginScrub();
    dragRef.current = { x: e.clientX, baseX: gsap.getProperty(track, 'x') as number, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbingRef.current || viewportRef.current !== 'mobile') return;
    const track = trackRef.current;
    if (!track) return;
    const d = e.clientX - dragRef.current.x;
    if (!dragRef.current.moved && Math.abs(d) < 6) return;
    dragRef.current.moved = true;
    const W = trackW();
    if (!W) return;
    const next = Math.max(-nRef.current * W, Math.min(0, dragRef.current.baseX + d));
    gsap.set(track, { x: next, force3D: true });
    updateGate();
  };

  const onPointerUp = () => {
    if (!scrubbingRef.current || viewportRef.current !== 'mobile') return;
    endScrub();
  };

  const gateOnKey = gate.on.join(',');
  useEffect(() => {
    const root = sectionRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    const els = Array.from(track.querySelectorAll<HTMLElement>('[data-seat-content]'));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        setInViewMap((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const entry of entries) {
            const idx = Number(entry.target.getAttribute('data-seat-index'));
            if (Number.isNaN(idx)) continue;
            if (next[idx] !== entry.isIntersecting) {
              next[idx] = entry.isIntersecting;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { root, threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [seats.length, viewport, gateOnKey]);

  if (n === 0) return <HeroSection />;

  const name = set?.name ?? 'Featured';
  const onSet = new Set(gate.on);

  return (
    <section
      ref={sectionRef}
      className={`hx-hero hx-hero--${viewport}`}
      aria-label={name}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={trackRef} className={`hx-track hx-track--${viewport}`} style={{ willChange: 'transform' }}>
        {seats.map((slide, seatIdx) => (
          <div key={`${String(slide._id)}-${seatIdx}`} className="hx-seat" data-seat={seatIdx}>
            <SeatCard
              slide={slide}
              seatIdx={seatIdx}
              isActive={onSet.has(seatIdx % n)}
              inView={inViewMap[seatIdx] ?? false}
              isMobile={isMobile}
              viewport={viewport}
              setName={name}
            />
          </div>
        ))}
      </div>
      {n > k ? (
        <div className="hx-dashes" role="tablist" aria-label={`${name} slides`}>
          {blocks.map((b, i) => (
            <button
              key={String(b._id ?? i)}
              type="button"
              role="tab"
              aria-selected={i === gate.active}
              aria-label={`Slide ${i + 1}`}
              className={`hx-dash${i === gate.active ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(i);
              }}
              onKeyDown={(e) => {
                const dash = e.currentTarget;
                const parent = dash.parentElement;
                if (!parent) return;
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  jumpTo((i + 1) % n);
                  ((dash.nextElementSibling ?? parent.firstElementChild) as HTMLElement | null)?.focus?.();
                }
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  jumpTo((i - 1 + n) % n);
                  ((dash.previousElementSibling ?? parent.lastElementChild) as HTMLElement | null)?.focus?.();
                }
                if (e.key === 'Home') {
                  e.preventDefault();
                  jumpTo(0);
                  (parent.firstElementChild as HTMLElement | null)?.focus?.();
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  jumpTo(n - 1);
                  (parent.lastElementChild as HTMLElement | null)?.focus?.();
                }
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
