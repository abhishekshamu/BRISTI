import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { heroService } from '@/services/hero.service';
import { HeroSection } from '@/components/home/HeroSection';
import { useHeroLive } from '@/hooks/useHeroLive';
import type { HeroBlock, HeroSlide } from '@shared/types';

const STEP_MS = 800;
const JUMP_MS = 700;
const SNAP_MS = 400;
const HOLD_FALLBACK = 4.5;
const HOLD_MIN = 0.3;
const HOLD_MAX = 5;
const RATIO = 601 / 751;

type ViewportKey = 'desktop' | 'tablet' | 'mobile';

const CONFIG: Record<ViewportKey, { gap: number; cardFactor: number; vPad: number }> = {
  desktop: { gap: 16, cardFactor: 0.4, vPad: 28 },
  tablet: { gap: 12, cardFactor: 0.4, vPad: 24 },
  mobile: { gap: 8, cardFactor: 0.72, vPad: 16 },
};

const mod = (a: number, b: number) => ((a % b) + b) % b;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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
  eager: boolean;
  isMobile: boolean;
  setName: string;
}

function SeatCard({ slide, seatIdx, eager, isMobile, setName }: SeatCardProps) {
  const image = isMobile ? slide.imageMobile || slide.image : slide.image;
  const video = isMobile ? slide.videoMobile || slide.video : slide.video;
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

  return (
    <div className="hx-card" role="group" aria-label={altText}>
      <div className="hx-card__stage" style={slide.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}>
        <div className="hx-card__slide">
          <div className="hx-card__shimmer" aria-hidden="true" />
          {image ? (
            <img
              src={image}
              alt={altText}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="hx-card__media"
              onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
            />
          ) : null}
          {video ? (
            <video
              src={video}
              muted
              loop
              playsInline
              preload="metadata"
              className="hx-card__video"
              onLoadedData={(e) => e.currentTarget.classList.add('is-loaded')}
              aria-hidden="true"
            />
          ) : null}
        </div>
        {slide.overlay ? <div className="hx-card__overlay" data-hx-overlay aria-hidden="true" /> : null}
        {slide.gradient ? <div className="hx-card__gradient" data-hx-gradient aria-hidden="true" /> : null}
      </div>

      <div className="hx-card__content" data-hx-content style={{ color: textColor, ...alignStyle }}>
        {slide.showEyebrow && slide.eyebrow ? (
          <span data-hx-part className="hx-card__eyebrow" style={{ color: 'var(--accent)' }}>
            <span className="hx-card__eyebrow-rule" aria-hidden="true" />
            {slide.eyebrow}
          </span>
        ) : null}
        {slide.heading ? <h2 data-hx-part className="hx-card__title">{slide.heading}</h2> : null}
        {slide.description ? <p data-hx-part className="hx-card__description">{slide.description}</p> : null}
        {slide.showCta && (slide.ctaText || slide.secondaryButtonText) ? (
          <div data-hx-part className="hx-card__cta-wrap">
            {slide.ctaText && href ? (
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

  const n = blocks.length;

  const sectionRef = useRef<HTMLElement>(null);
  const layoutRef = useRef({ w: 0, h: 0, gap: 16, step: 0, offset0: 0, cardW: 0 });
  const posRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const wheelTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef({ x: 0, base: 0, moved: false });
  const nRef = useRef(n);
  nRef.current = n;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const setRef = useRef(set);
  setRef.current = set;
  const pausedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const reducedRef = useRef(false);
  const retriedRef = useRef(false);
  const gateKeyRef = useRef('');

  const [gate, setGate] = useState<{ on: number[]; active: number }>({ on: [], active: 0 });
  const [retryTick, setRetryTick] = useState(0);

  const measure = useCallback(() => {
    const root = sectionRef.current;
    if (!root) return;
    const vp = viewportRef.current;
    const cfg = CONFIG[vp];
    const w = root.clientWidth;
    const h = root.clientHeight;
    if (!w || !h) return;
    const availH = h - cfg.vPad * 2;
    const cardW = Math.min(w * cfg.cardFactor, availH * RATIO);
    const cardH = cardW / RATIO;
    const step = cardW + cfg.gap;
    const offset0 = (w - (vp === 'mobile' ? cardW : cardW * 2 + cfg.gap)) / 2;
    layoutRef.current = { w, h, gap: cfg.gap, step, offset0, cardW };
    root.style.setProperty('--hx-w', `${cardW}px`);
    root.style.setProperty('--hx-h', `${cardH}px`);
  }, []);

  const applyLayout = useCallback((pos: number) => {
    const root = sectionRef.current;
    const L = layoutRef.current;
    if (!root || !L.step) return;
    const seats = root.querySelectorAll<HTMLElement>('[data-hx-seat]');
    const nCur = nRef.current;
    seats.forEach((seat, b) => {
      if (b >= nCur) return;
      let x = L.offset0 + (b - pos) * L.step;
      if (nCur > 1) {
        while (x + L.cardW < -L.gap * 2) x += nCur * L.step;
        while (x - L.gap > L.w) x -= nCur * L.step;
      }
      gsap.set(seat, { x, force3D: true });
    });
  }, []);

  const updateGate = useCallback(() => {
    const nCur = nRef.current;
    if (!nCur) return;
    const p = mod(Math.round(posRef.current), nCur);
    const on = viewportRef.current === 'mobile' ? [p] : [p, mod(p + 1, nCur)];
    const key = `${on.join(',')}|${p}`;
    if (key === gateKeyRef.current) return;
    gateKeyRef.current = key;
    setGate({ on, active: p });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const scheduleStep = useCallback(() => {
    clearTimer();
    const nCur = nRef.current;
    if (reducedRef.current || pausedRef.current || scrubbingRef.current || nCur < 2) return;
    const arriving = mod(Math.round(posRef.current) + 1, nCur);
    const slide = blocksRef.current[arriving];
    const hold = clamp(slide?.animationSpeed ?? setRef.current?.animationSpeed ?? HOLD_FALLBACK, HOLD_MIN, HOLD_MAX);
    timerRef.current = window.setTimeout(() => runStepRef.current(1, STEP_MS, 'power3.inOut'), hold * 1000);
  }, [clearTimer]);

  const runStep = useCallback(
    (delta: number, durationMs: number, ease: string) => {
      const L = layoutRef.current;
      if (!L.step) return;
      clearTimer();
      tweenRef.current?.kill();
      const proxy = { v: posRef.current };
      tweenRef.current = gsap.to(proxy, {
        v: proxy.v + delta,
        duration: durationMs / 1000,
        ease,
        onUpdate: () => {
          posRef.current = proxy.v;
          applyLayout(proxy.v);
          updateGate();
        },
        onComplete: () => {
          posRef.current = proxy.v;
          tweenRef.current = null;
          applyLayout(proxy.v);
          updateGate();
          scheduleStep();
        },
      });
    },
    [applyLayout, clearTimer, scheduleStep, updateGate]
  );

  const runStepRef = useRef(runStep);
  runStepRef.current = runStep;

  const jumpTo = useCallback(
    (index: number) => {
      const nCur = nRef.current;
      if (nCur < 2) return;
      const i = mod(index, nCur);
      const currentMain = mod(Math.round(posRef.current), nCur);
      let delta = i - currentMain;
      if (delta > nCur / 2) delta -= nCur;
      if (delta < -nCur / 2) delta += nCur;
      if (delta === 0) return;
      runStep(delta, JUMP_MS, 'power3.inOut');
    },
    [runStep]
  );

  const beginScrub = useCallback(() => {
    if (scrubbingRef.current) return;
    if (reducedRef.current || nRef.current < 2) return;
    scrubbingRef.current = true;
    clearTimer();
    tweenRef.current?.kill();
    tweenRef.current = null;
    dragRef.current.base = posRef.current;
  }, [clearTimer]);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    const L = layoutRef.current;
    if (!L.step) return;
    const target = Math.round(posRef.current);
    if (target === posRef.current) {
      applyLayout(target);
      updateGate();
      scheduleStep();
      return;
    }
    const proxy = { v: posRef.current };
    tweenRef.current?.kill();
    tweenRef.current = gsap.to(proxy, {
      v: target,
      duration: SNAP_MS / 1000,
      ease: 'power2.out',
      onUpdate: () => {
        posRef.current = proxy.v;
        applyLayout(proxy.v);
        updateGate();
      },
      onComplete: () => {
        posRef.current = proxy.v;
        tweenRef.current = null;
        applyLayout(proxy.v);
        updateGate();
        scheduleStep();
      },
    });
  }, [applyLayout, scheduleStep, updateGate]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    if (mq.matches) clearTimer();
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
      if (e.matches) {
        clearTimer();
        tweenRef.current?.kill();
        tweenRef.current = null;
        applyLayout(posRef.current);
        updateGate();
      } else {
        scheduleStep();
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [applyLayout, clearTimer, scheduleStep, updateGate]);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root || n === 0) return;
    measure();
    const L = layoutRef.current;
    if (!L.step) {
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
    posRef.current = 0;
    applyLayout(0);
    updateGate();
    if (reducedRef.current || n < 2) return;
    scheduleStep();
  }, [n, viewport, retryTick, measure, applyLayout, updateGate, scheduleStep]);

  useEffect(() => {
    measure();
    const el = sectionRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      measure();
      applyLayout(posRef.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, applyLayout]);

  const slideIdsKey = blocks.map((b) => String(b._id ?? '')).join(',');
  useEffect(() => {
    if (!layoutRef.current.step) return;
    applyLayout(posRef.current);
    updateGate();
  }, [slideIdsKey, applyLayout, updateGate]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting ?? true;
        if (inView) {
          pausedRef.current = false;
          scheduleStep();
        } else {
          pausedRef.current = true;
          clearTimer();
          tweenRef.current?.kill();
          tweenRef.current = null;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        clearTimer();
        tweenRef.current?.kill();
        tweenRef.current = null;
      } else {
        pausedRef.current = false;
        scheduleStep();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scheduleStep, clearTimer]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX);
      const dy = Math.abs(e.deltaY);
      if (!(dx > 4 && dx >= dy)) return;
      e.preventDefault();
      const L = layoutRef.current;
      if (!L.step || nRef.current < 2 || reducedRef.current) return;
      if (!scrubbingRef.current) beginScrub();
      posRef.current += e.deltaX / L.step;
      applyLayout(posRef.current);
      updateGate();
      if (wheelTimerRef.current !== undefined) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => endScrub(), 160);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelTimerRef.current !== undefined) window.clearTimeout(wheelTimerRef.current);
    };
  }, [applyLayout, beginScrub, endScrub, updateGate]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewportRef.current !== 'mobile') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (nRef.current < 2 || reducedRef.current) return;
    beginScrub();
    dragRef.current = { x: e.clientX, base: dragRef.current.base, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbingRef.current || viewportRef.current !== 'mobile') return;
    const L = layoutRef.current;
    if (!L.step) return;
    const d = e.clientX - dragRef.current.x;
    if (!dragRef.current.moved && Math.abs(d) < 6) return;
    dragRef.current.moved = true;
    posRef.current = dragRef.current.base - d / L.step;
    applyLayout(posRef.current);
    updateGate();
  };

  const onPointerUp = () => {
    if (!scrubbingRef.current || viewportRef.current !== 'mobile') return;
    endScrub();
  };

  const gateKey = `${gate.on.join(',')}|${gate.active}`;
  useEffect(() => {
    const root = sectionRef.current;
    if (!root || n === 0) return;
    const onSet = new Set(gate.on);
    root.querySelectorAll<HTMLElement>('[data-hx-seat]').forEach((seat, b) => {
      const slide = blocksRef.current[b];
      if (!slide) return;
      const main = onSet.has(b);
      const reduced = reducedRef.current;
      const overlay = seat.querySelector<HTMLElement>('[data-hx-overlay]');
      const gradient = seat.querySelector<HTMLElement>('[data-hx-gradient]');
      const img = seat.querySelector<HTMLElement>('.hx-card__media');
      const video = seat.querySelector<HTMLVideoElement>('.hx-card__video');
      const content = seat.querySelector<HTMLElement>('[data-hx-content]');
      const parts = content ? Array.from(content.querySelectorAll<HTMLElement>('[data-hx-part]')) : [];
      const zoom = slide.animationType === 'zoom';

      if (main) {
        if (overlay) {
          const op = slide.overlay ? clamp(Number(slide.overlayOpacity ?? 45) / 100, 0, 0.9) : 0;
          if (reduced) gsap.set(overlay, { opacity: op });
          else gsap.to(overlay, { opacity: op, duration: 0.7, ease: 'power2.out' });
        }
        if (gradient) {
          if (reduced) gsap.set(gradient, { opacity: 1 });
          else gsap.to(gradient, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        }
        if (zoom && img) {
          gsap.killTweensOf(img);
          if (reduced) gsap.set(img, { scale: 1.05, transformOrigin: '50% 50%' });
          else gsap.fromTo(img, { scale: 1.02, transformOrigin: '50% 50%' }, { scale: 1.16, transformOrigin: '50% 50%', duration: 22, ease: 'none' });
        }
        if (video) video.play().catch(() => undefined);
        if (content) {
          content.classList.add('is-main');
          if (reduced) {
            gsap.set(parts, { opacity: 1, y: 0 });
          } else {
            gsap.killTweensOf(parts);
            gsap.fromTo(parts, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.15 });
          }
        }
      } else {
        if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.5, ease: 'power2.in' });
        if (gradient) gsap.to(gradient, { opacity: 0, duration: 0.5, ease: 'power2.in' });
        if (zoom && img) {
          gsap.killTweensOf(img);
          gsap.to(img, { scale: 1, duration: 0.7, ease: 'power2.inOut' });
        }
        if (video) video.pause();
        if (content) {
          if (reduced) {
            content.classList.remove('is-main');
            gsap.set(parts, { opacity: 0, y: 14 });
          } else if (content.classList.contains('is-main')) {
            gsap.killTweensOf(parts);
            gsap.to(parts, {
              opacity: 0,
              y: 14,
              duration: 0.35,
              ease: 'power2.in',
              onComplete: () => content.classList.remove('is-main'),
            });
          }
        }
      }
    });
  }, [gateKey, slideIdsKey, n, viewport]);

  useEffect(() => {
    if (!blocks.length) return;
    const nextIdx = mod(Math.round(posRef.current) + 3, blocks.length);
    const slide = blocks[nextIdx];
    const src = isMobile ? slide.imageMobile || slide.image : slide.image;
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [gateKey, isMobile, blocks.length]);

  useEffect(
    () => () => {
      clearTimer();
      tweenRef.current?.kill();
      const root = sectionRef.current;
      if (root) {
        gsap.killTweensOf(Array.from(root.querySelectorAll<HTMLElement>('[data-hx-seat], [data-hx-overlay], [data-hx-gradient], [data-hx-content], .hx-card__media')));
      }
    },
    [clearTimer]
  );

  if (n === 0) return <HeroSection />;

  const name = set?.name ?? 'Featured';
  const eagerSeat = (b: number) => b < 3 || b === n - 1;

  return (
    <section
      ref={sectionRef}
      className={`hx-hero hx-hero--${viewport}`}
      aria-label={name}
      aria-roledescription="carousel"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => {
        if (viewportRef.current !== 'mobile') {
          pausedRef.current = true;
          clearTimer();
        }
      }}
      onMouseLeave={() => {
        if (viewportRef.current !== 'mobile') {
          pausedRef.current = false;
          scheduleStep();
        }
      }}
    >
      <div className="hx-stage">
        {blocks.map((slide, b) => (
          <div key={`${b}-${String(slide._id ?? '')}`} className="hx-seat" data-hx-seat={b}>
            <SeatCard
              slide={slide}
              seatIdx={b}
              eager={eagerSeat(b)}
              isMobile={isMobile}
              setName={name}
            />
          </div>
        ))}
      </div>
      {n > 1 ? (
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
