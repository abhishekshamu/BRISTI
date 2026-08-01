import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { heroService } from '@/services/hero.service';
import { HeroSection } from '@/components/home/HeroSection';
import type { HeroBlock } from '@shared/types';

const HOLD_MS = 4800;
const COPIES = 3;
const DEFAULT_SPEED = 0.7;

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function getVisibleCount(): number {
  if (typeof window === 'undefined') return 5;
  if (window.matchMedia('(max-width: 639px)').matches) return 1;
  if (window.matchMedia('(max-width: 1023px)').matches) return 3;
  return 5;
}

function isFineHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
}

function resolveColor(value?: string): string | undefined {
  if (!value) return undefined;
  return value.startsWith('#') ? value : `var(--${value})`;
}

function blockHref(button: HeroBlock['primaryButton']): string | undefined {
  if (!button?.link) return undefined;
  if (button.linkType === 'collection') return `/collection/${button.link}`;
  if (button.linkType === 'category') return `/shop?category=${button.link}`;
  if (button.linkType === 'product') return `/product/${button.link}`;
  return button.link;
}

interface PanelProps {
  block: HeroBlock;
  copy: number;
  visible: number;
  inVisibleWindow: boolean;
  inMediaWindow: boolean;
  isLeading: boolean;
}

function Panel({ block, copy, visible, inVisibleWindow, inMediaWindow, isLeading }: PanelProps) {
  const primaryHref = blockHref(block.primaryButton);
  const alignment = block.contentAlignment ?? 'left';
  const alignClass =
    alignment === 'center' ? 'items-center text-center' : alignment === 'right' ? 'items-end text-right' : 'items-start text-left';
  const textColor = resolveColor(block.textColor) ?? 'var(--on-ink)';
  const accentColor = resolveColor(block.accentColor) ?? 'var(--accent)';
  const buttonColor = resolveColor(block.buttonColor);
  const kenburns = (block.animationStyle ?? 'kenburns') === 'kenburns' && inVisibleWindow;
  const enter = inVisibleWindow && isLeading;
  const altText = block.altText || block.seoLabel || block.title;

  const isMobile = visible === 1;
  const image = isMobile ? block.imageMobile || block.image : block.image;
  const video = isMobile ? block.videoMobile || block.video : block.video;

  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isLeading) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [isLeading]);

  return (
    <div className="hero-engine__panel" role="group" aria-label={block.seoLabel || block.title}>
      <div className="hero-engine__shimmer" aria-hidden="true" />

      {image && inMediaWindow ? (
        <img
          key={`${String(block._id)}-${copy}-${isMobile ? 'm' : 'd'}`}
          src={image}
          alt={altText}
          loading="lazy"
          decoding="async"
          className={`hero-engine__media ${kenburns ? 'hero-engine__kenburns' : ''}`}
          draggable={false}
        />
      ) : null}

      {video && inMediaWindow ? (
        <video
          ref={videoRef}
          src={video}
          muted
          loop
          playsInline
          preload="metadata"
          className={`hero-engine__media ${kenburns ? 'hero-engine__kenburns' : ''}`}
          aria-hidden="true"
        />
      ) : null}

      {block.overlay ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.85, Math.max(0, (block.overlayOpacity ?? 45) / 100))})` }}
          aria-hidden="true"
        />
      ) : null}

      {block.gradient ? (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"
          aria-hidden="true"
        />
      ) : null}

      <div className={`hero-engine__content ${alignClass} ${enter ? 'hero-engine__content--enter' : ''}`} style={{ color: textColor }}>
        {block.badge ? (
          <span
            className="hero-engine__eyebrow mb-4 flex items-center gap-3 font-medium uppercase tracking-lux"
            style={{ color: accentColor }}
          >
            <span className="h-px w-8" style={{ backgroundColor: accentColor }} />
            {block.badge}
          </span>
        ) : null}

        <h2 className="hero-engine__panel-title font-display">{block.title}</h2>

        {primaryHref && block.primaryButton?.label ? (
          <div className="mt-7">
            <span style={buttonColor ? { ['--btn-gold-bg' as string]: buttonColor } : undefined}>
              {primaryHref.startsWith('/') ? (
                <Link to={primaryHref} className="btn-lux-gold hero-engine__cta" onClick={(e) => e.stopPropagation()}>
                  {block.primaryButton.label}
                </Link>
              ) : (
                <a href={primaryHref} target="_blank" rel="noreferrer" className="btn-lux-gold hero-engine__cta" onClick={(e) => e.stopPropagation()}>
                  {block.primaryButton.label}
                </a>
              )}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HeroEngine() {
  const { data } = useQuery({
    queryKey: ['hero', 'active'],
    queryFn: heroService.getActive,
    staleTime: 0,
    refetchInterval: 5000,
  });
  const allBlocks = data ?? [];

  const [visible, setVisible] = useState(getVisibleCount);
  const [mediaTick, setMediaTick] = useState(0);

  const blocks = useMemo(() => {
    const breakpoint = visible === 1 ? 'mobile' : visible === 3 ? 'tablet' : 'desktop';
    return allBlocks.filter((block) => block.visibility?.[breakpoint] !== false);
  }, [allBlocks, visible]);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const stepRef = useRef(0);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);
  const dragDeltaRef = useRef(0);
  const dragStartRef = useRef({ x: 0, moved: false });
  const pausedRef = useRef(false);
  const phaseRef = useRef<'wait' | 'slide'>('wait');
  const slideRef = useRef({ startT: 0, startPx: 0, endPx: 0, duration: 0, toStep: 0 });
  const holdUntilRef = useRef(0);
  const blocksRef = useRef(blocks);

  blocksRef.current = blocks;
  const total = blocks.length;

  useEffect(() => {
    const N = blocks.length;
    const s = stepRef.current;
    if (N === 0) {
      phaseRef.current = 'wait';
      holdUntilRef.current = performance.now() + HOLD_MS;
      return;
    }
    if (s > N) stepRef.current = N;
    if (s < -N) stepRef.current = -N;
    if (phaseRef.current === 'wait') {
      holdUntilRef.current = performance.now() + HOLD_MS;
    }
  }, [blocks.length, mediaTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      widthRef.current = container.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);

    const mqSmall = window.matchMedia('(max-width: 639px)');
    const mqMedium = window.matchMedia('(max-width: 1023px)');
    const onMq = () => setVisible(getVisibleCount());
    mqSmall.addEventListener('change', onMq);
    mqMedium.addEventListener('change', onMq);

    const io = new IntersectionObserver(
      (entries) => {
        pausedRef.current = entries[0] ? !entries[0].isIntersecting : pausedRef.current;
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const onVisibility = () => {
      if (document.hidden) pausedRef.current = true;
      else pausedRef.current = false;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const hoverable = isFineHover();
    const onHoverEnter = () => {
      if (hoverable) pausedRef.current = true;
    };
    const onHoverLeave = () => {
      if (hoverable) pausedRef.current = false;
    };
    container.addEventListener('pointerenter', onHoverEnter);
    container.addEventListener('pointerleave', onHoverLeave);

    const animateTo = (targetStep: number) => {
      const panelW = widthRef.current / getVisibleCount();
      phaseRef.current = 'slide';
      slideRef.current = {
        startT: performance.now(),
        startPx: -stepRef.current * panelW,
        endPx: -targetStep * panelW,
        duration: 350 + Math.abs(targetStep - stepRef.current) * 220,
        toStep: targetStep,
      };
    };

    const render = () => {
      const trackEl = trackRef.current;
      if (!trackEl) return;
      const panelW = widthRef.current / getVisibleCount();
      const step = stepRef.current;
      const drag = draggingRef.current ? dragDeltaRef.current : 0;
      trackEl.style.transform = `translate3d(${(-step * panelW + drag).toFixed(2)}px, 0, 0)`;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      draggingRef.current = true;
      dragDeltaRef.current = 0;
      dragStartRef.current = { x: e.clientX, moved: false };
      if (phaseRef.current === 'slide') phaseRef.current = 'wait';
      container.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      if (!dragStartRef.current.moved && Math.abs(dx) < 6) return;
      dragStartRef.current.moved = true;
      dragDeltaRef.current = dx;
      render();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const dx = dragStartRef.current.moved ? e.clientX - dragStartRef.current.x : 0;
      const panelW = widthRef.current / getVisibleCount();
      const N = blocksRef.current.length;
      if (Math.abs(dx) > panelW * 0.25) {
        const steps = Math.round(dx / panelW);
        const target = Math.max(-N, Math.min(N, stepRef.current - steps));
        animateTo(target);
      } else {
        animateTo(stepRef.current);
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const N = blocksRef.current.length;
      if (N === 0) return;
      const panelW = widthRef.current / getVisibleCount();
      const trackEl = trackRef.current;
      if (!trackEl) return;

      if (phaseRef.current === 'wait') {
        if (draggingRef.current) return;
        if (pausedRef.current) {
          holdUntilRef.current = now + HOLD_MS;
          return;
        }
        if (now >= holdUntilRef.current) {
          const cur = stepRef.current;
          const to = cur + 1;
          const speed = blocksRef.current[((cur % N) + N) % N]?.animationSpeed ?? DEFAULT_SPEED;
          phaseRef.current = 'slide';
          slideRef.current = {
            startT: now,
            startPx: -cur * panelW,
            endPx: -to * panelW,
            duration: Math.max(350, speed * 1000),
            toStep: to,
          };
        }
      } else {
        const s = slideRef.current;
        const t = Math.min(1, (now - s.startT) / s.duration);
        const eased = easeInOutQuart(t);
        trackEl.style.transform = `translate3d(${(s.startPx + (s.endPx - s.startPx) * eased).toFixed(2)}px, 0, 0)`;
        if (t >= 1) {
          let ns = s.toStep;
          if (ns > N) ns = -N;
          if (ns < -N) ns = N;
          stepRef.current = ns;
          phaseRef.current = 'wait';
          holdUntilRef.current = now + HOLD_MS;
          setMediaTick((v) => v + 1);
        }
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mqSmall.removeEventListener('change', onMq);
      mqMedium.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('pointerenter', onHoverEnter);
      container.removeEventListener('pointerleave', onHoverLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  if (blocks.length === 0) return <HeroSection />;

  const step = stepRef.current;
  const copies = Array.from({ length: COPIES }, (_, c) => c);
  const cycle = Math.max(1, total);

  return (
    <section
      ref={containerRef}
      className="hero-engine"
      aria-label="Featured campaigns"
      style={{ touchAction: 'pan-y' }}
    >
      <div ref={trackRef} className="hero-engine__track">
        {copies.map((copy) =>
          blocks.map((block, index) => {
            const panelPosition = copy * cycle + index;
            const inVisibleWindow = panelPosition >= step && panelPosition < step + visible;
            const inMediaWindow = panelPosition >= step - visible && panelPosition < step + visible * 2;
            const isLeading = panelPosition >= step - 1 && panelPosition <= step;
            return (
              <Panel
                key={`${String(block._id)}::${copy}`}
                block={block}
                copy={copy}
                visible={visible}
                inVisibleWindow={inVisibleWindow}
                inMediaWindow={inMediaWindow}
                isLeading={isLeading}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
