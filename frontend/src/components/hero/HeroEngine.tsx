import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { heroService } from '@/services/hero.service';
import { HeroSkeleton } from '@/components/hero/HeroSkeleton';
import { useHeroLive } from '@/hooks/useHeroLive';
import type { HeroBlock, HeroSlide } from '@shared/types';

const STEP_MS = 3000;
const JUMP_MS = 2600;
const SNAP_MS = 500;
const FLING_MS = 750;
const HOLD_FALLBACK = 1.1;
const HOLD_MIN = 1.0;
const HOLD_MAX = 1.2;
const RATIO = 601 / 749;

const LUX_P1X = 0.22;
const LUX_P1Y = 0.61;
const LUX_P2X = 0.36;
const LUX_P2Y = 1;

function luxBezierEase(): gsap.EaseFunction {
  const cx = 3 * LUX_P1X;
  const bx = 3 * (LUX_P2X - LUX_P1X) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * LUX_P1Y;
  const by = 3 * (LUX_P2Y - LUX_P1Y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleDX(t);
      if (Math.abs(dx) < 1e-6) break;
      const x2 = sampleX(t) - x;
      if (Math.abs(x2) < 1e-6) break;
      t -= x2 / dx;
    }
    return t;
  };
  return (p: number) => sampleY(solveX(clamp(p, 0, 1)));
}

const LUX_EASE = luxBezierEase();

type ViewportKey = 'desktop' | 'tablet' | 'mobile';

const CONFIG: Record<ViewportKey, { gap: number; cardFactor: number; vPad: number }> = {
  desktop: { gap: 16, cardFactor: 0.47, vPad: 20 },
  tablet: { gap: 12, cardFactor: 0.4, vPad: 24 },
  mobile: { gap: 6, cardFactor: 0.78, vPad: 16 },
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

interface BridgeState {
  id: number;
  from: number;
  to: number;
  durationMs: number;
}

interface DotBridgeProps {
  bridge: BridgeState;
  dotRefs: (HTMLButtonElement | null)[];
  onGrow: () => void;
  onDone: () => void;
}

function DotBridge({ bridge, dotRefs, onGrow, onDone }: DotBridgeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const onGrowRef = useRef(onGrow);
  onGrowRef.current = onGrow;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timers: number[] = [];
    const fromEl = dotRefs[bridge.from];
    const toEl = dotRefs[bridge.to];
    const container = ref.current?.parentElement;
    if (!fromEl || !toEl || !container) {
      onDoneRef.current();
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    const cRect = container.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();
    const y = (fRect.top + fRect.bottom) / 2 - cRect.top;
    const x1 = (fRect.left + fRect.right) / 2 - cRect.left;
    const x2 = (tRect.left + tRect.right) / 2 - cRect.left;
    const left = Math.min(x1, x2);
    const distance = Math.max(1, Math.abs(x2 - x1));
    const forward = x2 >= x1;
    const growOrigin = forward ? 'left center' : 'right center';
    const shrinkOrigin = forward ? 'right center' : 'left center';
    setStyle({
      left,
      top: y - 3,
      width: distance,
      opacity: 0,
      transform: 'scaleX(0)',
      transformOrigin: growOrigin,
      transition: 'none',
    });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStyle({
          left,
          top: y - 3,
          width: distance,
          opacity: 1,
          transform: 'scaleX(1)',
          transformOrigin: growOrigin,
          transition: `transform ${bridge.durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 150ms ease-out`,
        });
      });
    });
    timers.push(
      window.setTimeout(() => {
        onGrowRef.current();
        setStyle((s) => ({
          ...s,
          transform: 'scaleX(0)',
          transformOrigin: shrinkOrigin,
          transition: 'transform 500ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 240ms ease-out',
          opacity: 0,
        }));
        timers.push(window.setTimeout(() => onDoneRef.current(), 520));
      }, bridge.durationMs)
    );
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [bridge, dotRefs]);

  return <div ref={ref} className="hx-dot-bridge" style={style} aria-hidden="true" />;
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
  const dragRef = useRef<{ x: number; base: number; moved: boolean; suppress: boolean; samples: { t: number; x: number }[] }>({
    x: 0,
    base: 0,
    moved: false,
    suppress: false,
    samples: [],
  });
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

  const [bridge, setBridge] = useState<BridgeState | null>(null);
  const [bridgeShrinking, setBridgeShrinking] = useState(false);
  const bridgeIdRef = useRef(0);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const clearBridge = useCallback(() => {
    setBridge(null);
    setBridgeShrinking(false);
  }, []);

  const onBridgeGrow = useCallback(() => setBridgeShrinking(true), []);

  const onStepStart = useCallback((from: number, to: number, durationMs: number) => {
    if (reducedRef.current || from === to) return;
    setBridgeShrinking(false);
    setBridge({ id: ++bridgeIdRef.current, from, to, durationMs });
  }, []);
  const onStepStartRef = useRef(onStepStart);
  onStepStartRef.current = onStepStart;

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
    if (vp === 'mobile') {
      root.style.height = `${(w * cfg.cardFactor) / RATIO + cfg.vPad * 2}px`;
    } else {
      root.style.removeProperty('height');
    }
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
    timerRef.current = window.setTimeout(() => runStepRef.current(1, STEP_MS, LUX_EASE), hold * 1000);
  }, [clearTimer]);

  const runStep = useCallback(
    (delta: number, durationMs: number, ease: string | gsap.EaseFunction) => {
      const L = layoutRef.current;
      if (!L.step) return;
      const from = mod(Math.round(posRef.current), nRef.current);
      onStepStartRef.current?.(from, mod(from + Math.round(delta), nRef.current), durationMs);
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
      runStep(delta, JUMP_MS, LUX_EASE);
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

  const settle = useCallback(() => {
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
      ease: LUX_EASE,
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

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    const L = layoutRef.current;
    if (!L.step) return;
    const now = performance.now();
    const recent = dragRef.current.samples.filter((s) => now - s.t <= 120);
    let vPxPerMs = 0;
    if (recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      if (b.t - a.t >= 16) vPxPerMs = (b.x - a.x) / (b.t - a.t);
    }
    if (Math.abs(vPxPerMs) > 0.35 && nRef.current > 1) {
      const vStepsPerMs = -vPxPerMs / L.step;
      const target = clamp(posRef.current + vStepsPerMs * 220, posRef.current - 2.5, posRef.current + 2.5);
      const proxy = { v: posRef.current };
      tweenRef.current?.kill();
      tweenRef.current = gsap.to(proxy, {
        v: target,
        duration: FLING_MS / 1000,
        ease: LUX_EASE,
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
          settle();
        },
      });
    } else {
      settle();
    }
  }, [applyLayout, settle, updateGate]);

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
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (nRef.current < 2 || reducedRef.current) return;
    beginScrub();
    dragRef.current = {
      x: e.clientX,
      base: dragRef.current.base,
      moved: false,
      suppress: false,
      samples: [{ t: performance.now(), x: e.clientX }],
    };
    sectionRef.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbingRef.current) return;
    const L = layoutRef.current;
    if (!L.step) return;
    const d = e.clientX - dragRef.current.x;
    if (!dragRef.current.moved && Math.abs(d) < 6) return;
    dragRef.current.moved = true;
    posRef.current = dragRef.current.base - d / L.step;
    applyLayout(posRef.current);
    updateGate();
    const now = performance.now();
    const s = dragRef.current.samples;
    s.push({ t: now, x: e.clientX });
    if (s.length > 32 || now - s[0].t > 160) s.shift();
  };

  const onPointerUp = () => {
    if (!scrubbingRef.current) return;
    if (dragRef.current.moved) dragRef.current.suppress = true;
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
      const video = seat.querySelector<HTMLVideoElement>('.hx-card__video');
      const content = seat.querySelector<HTMLElement>('[data-hx-content]');
      const parts = content ? Array.from(content.querySelectorAll<HTMLElement>('[data-hx-part]')) : [];

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
  }, [gateKey, slideIdsKey, n, viewport, gate.on]);

  useEffect(() => {
    if (!blocks.length) return;
    const nextIdx = mod(Math.round(posRef.current) + 3, blocks.length);
    const slide = blocks[nextIdx];
    const src = isMobile ? slide.imageMobile || slide.image : slide.image;
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [gateKey, isMobile, blocks.length, blocks]);

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

  // Never render a legacy/default hero. Until the latest CMS hero data has
  // loaded (or when no hero is configured), show a skeleton placeholder only.
  if (n === 0) return <HeroSkeleton />;

  const name = set?.name ?? 'Featured';
  const eagerSeat = (b: number) => b < 3 || b === n - 1;
  const activeDot = bridge && !bridgeShrinking ? bridge.from : gate.active;

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
      onClick={(e) => {
        if (dragRef.current.suppress) {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current.suppress = false;
        }
      }}
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
        <div className="hx-dots" role="tablist" aria-label={`${name} slides`}>
          {bridge ? (
            <DotBridge key={bridge.id} bridge={bridge} dotRefs={dotRefs.current} onGrow={onBridgeGrow} onDone={clearBridge} />
          ) : null}
          {blocks.map((b, i) => (
            <button
              key={String(b._id ?? i)}
              type="button"
              role="tab"
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              aria-selected={i === activeDot}
              aria-label={`Slide ${i + 1}`}
              className={`hx-dot${i === activeDot ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(i);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  jumpTo((i + 1) % n);
                  dotRefs.current[(i + 1) % n]?.focus();
                }
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  jumpTo((i - 1 + n) % n);
                  dotRefs.current[(i - 1 + n) % n]?.focus();
                }
                if (e.key === 'Home') {
                  e.preventDefault();
                  jumpTo(0);
                  dotRefs.current[0]?.focus();
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  jumpTo(n - 1);
                  dotRefs.current[n - 1]?.focus();
                }
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
