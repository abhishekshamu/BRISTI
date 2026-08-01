import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { heroService } from '@/services/hero.service';
import { HeroSection } from '@/components/home/HeroSection';
import type { HeroBlock, HeroPanel, HeroSlide } from '@shared/types';

const HOLD_MS = 4500;
const SLIDE_MS = 600;
const DEFAULT_SPEED = 0.7;
const MAX_PANELS = 3;

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

function useSlideRotator(slides: HeroSlide[], paused: boolean, speed: number, initialIndex = 0, phaseOffsetMs = 0) {
  const count = slides.length;
  const [current, setCurrent] = useState(() => (count > 0 ? initialIndex % count : 0));
  const [previous, setPrevious] = useState<number | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  const firstCycleRef = useRef(true);
  const phaseOffsetRef = useRef(phaseOffsetMs);

  const jumpTo = useCallback(
    (target: number) => {
      if (count === 0) return;
      const clamped = ((target % count) + count) % count;
      setPrevious(currentRef.current !== clamped ? currentRef.current : null);
      currentRef.current = clamped;
      setCurrent(clamped);
    },
    [count]
  );

  useEffect(() => {
    if (current >= count) setCurrent(0);
  }, [count, current]);

  useEffect(() => {
    if (count <= 1) return;
    const cycleMs = HOLD_MS + Math.max(SLIDE_MS, speed * 1000);
    let timeout: number | undefined;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        jumpTo(currentRef.current + 1);
        schedule();
      }, cycleMs + (firstCycleRef.current ? phaseOffsetRef.current : 0));
      firstCycleRef.current = false;
    };
    if (!paused) schedule();
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [count, paused, speed, jumpTo, current]);

  return { current, previous, jumpTo };
}

interface SlideLayerProps {
  slide: HeroSlide;
  visible: boolean;
  exiting: boolean;
  isMobile: boolean;
  paused: boolean;
  altText: string;
}

function SlideLayer({ slide, visible, exiting, isMobile, paused, altText }: SlideLayerProps) {
  const image = isMobile ? slide.imageMobile || slide.image : slide.image;
  const video = isMobile ? slide.videoMobile || slide.video : slide.video;
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationType = slide.animationType ?? 'zoom';
  const zoom = animationType === 'zoom';

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible && !paused) v.play().catch(() => undefined);
    else v.pause();
  }, [visible, paused]);

  const className = [
    'hero-panel__slide',
    `hero-panel__anim--${animationType}`,
    visible ? 'hero-panel__slide--enter' : '',
    exiting ? 'hero-panel__slide--exit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-hidden={!visible}>
      <div className="hero-panel__shimmer" aria-hidden="true" />
      {image ? (
        <img
          src={image}
          alt={altText}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`hero-panel__media ${visible && zoom ? 'hero-panel__kenburns' : ''}`}
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
          className={`hero-panel__media ${visible && zoom ? 'hero-panel__kenburns' : ''}`}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

interface PanelViewProps {
  panel: HeroPanel;
  index: number;
  paused: boolean;
  isMobile: boolean;
  speed: number;
  gradient: boolean;
  setName: string;
  phaseOffsetMs: number;
}

function PanelView({ panel, index, paused, isMobile, speed, gradient, setName, phaseOffsetMs }: PanelViewProps) {
  const slides = panel.slides;
  const { current, previous, jumpTo } = useSlideRotator(slides, paused, speed, index, phaseOffsetMs);
  const slide = slides[current] ?? slides[0];
  const href = slideHref(slide);
  const altText = slide.altText || slide.heading || panel.label || `${setName} panel ${index + 1}`;
  const slideKey = String(slide._id ?? current);
  const headingColor = slide.headingColor || '#FFFFFF';

  return (
    <div className="hero-panel" role="group" aria-label={panel.label || `${setName} panel ${index + 1}`}>
      <div className="hero-panel__stage" style={slide?.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}>
        {previous !== null && slides[previous] ? (
          <SlideLayer slide={slides[previous]} visible={false} exiting isMobile={isMobile} paused={paused} altText={altText} />
        ) : null}
        {slide ? (
          <SlideLayer key={slideKey} slide={slide} visible exiting={false} isMobile={isMobile} paused={paused} altText={altText} />
        ) : null}
      </div>

      {gradient ? <div className="hero-panel__gradient" aria-hidden="true" /> : null}

      {slide ? (
        <div key={`content-${slideKey}`} className="hero-panel__content hero-panel__content--enter">
          {slide.showEyebrow && slide.eyebrow ? (
            <span className="hero-panel__eyebrow" style={{ color: 'var(--accent)' }}>
              <span className="hero-panel__eyebrow-rule" aria-hidden="true" />
              {slide.eyebrow}
            </span>
          ) : null}
          {slide.heading ? <h2 className="hero-panel__title" style={{ color: headingColor }}>{slide.heading}</h2> : null}
          {slide.description ? <p className="hero-panel__description">{slide.description}</p> : null}
          {slide.showCta && (slide.ctaText || slide.secondaryButtonText) ? (
            <div className="hero-panel__cta-wrap">
              {slide.showCta && slide.ctaText && href ? (
                href.startsWith('/') ? (
                  <Link to={href} className="btn-lux-gold hero-panel__cta" onClick={(e) => e.stopPropagation()}>
                    {slide.ctaText}
                  </Link>
                ) : (
                  <a href={href} target="_blank" rel="noreferrer" className="btn-lux-gold hero-panel__cta" onClick={(e) => e.stopPropagation()}>
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
      ) : null}

      {slides.length > 1 ? (
        <div className="hero-panel__dashes" role="tablist" aria-label={`${panel.label || 'Panel'} slides`}>
          {slides.map((s, i) => (
            <button
              key={String(s._id ?? i)}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}`}
              className={`hero-panel__dash${i === current ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                jumpTo(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface MobileCarouselProps {
  panels: HeroPanel[];
  paused: boolean;
  speed: number;
  gradient: boolean;
  setName: string;
}

function MobileCarousel({ panels, paused, speed, gradient, setName }: MobileCarouselProps) {
  const [panelIndex, setPanelIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const indexRef = useRef(0);
  indexRef.current = panelIndex;
  const dragStartRef = useRef({ x: 0, moved: false });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      widthRef.current = el.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setDragging(true);
    setDx(0);
    dragStartRef.current = { x: e.clientX, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - dragStartRef.current.x;
    if (!dragStartRef.current.moved && Math.abs(delta) < 6) return;
    dragStartRef.current.moved = true;
    setDx(delta);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    const width = widthRef.current;
    const delta = dragStartRef.current.moved ? e.clientX - dragStartRef.current.x : 0;
    setDragging(false);
    setDx(0);
    if (Math.abs(delta) > width * 0.25) {
      const next = delta > 0 ? indexRef.current - 1 : indexRef.current + 1;
      setPanelIndex(Math.max(0, Math.min(panels.length - 1, next)));
    }
  };

  const baseX = -panelIndex * widthRef.current;

  return (
    <div
      ref={rootRef}
      className="hero-mobile"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="hero-mobile__track"
        style={{
          transform: `translate3d(${(baseX + dx).toFixed(2)}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {panels.map((panel, index) => (
          <div key={String(panel._id ?? index)} className="hero-mobile__slide">
            <PanelView
              panel={panel}
              index={index}
              paused={paused}
              isMobile
              speed={speed}
              gradient={gradient}
              setName={setName}
              phaseOffsetMs={index * 1500}
            />
          </div>
        ))}
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
  const sets = data ?? [];
  const set = sets[0] as HeroBlock | undefined;

  const panels = useMemo(() => {
    if (!set?.panels) return [];
    return set.panels.filter((p) => (p.slides ?? []).length > 0).slice(0, MAX_PANELS);
  }, [set]);

  const isMobile = useMediaQuery('(max-width: 767px)');

  const sectionRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const applyPaused = useCallback((value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => applyPaused(entries[0] ? !entries[0].isIntersecting : pausedRef.current),
      { threshold: 0.05 }
    );
    io.observe(el);
    const onVisibility = () => applyPaused(document.hidden);
    const hoverable = isFineHover();
    const onEnter = () => {
      if (hoverable) applyPaused(true);
    };
    const onLeave = () => {
      if (hoverable) applyPaused(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [applyPaused]);

  if (panels.length === 0) return <HeroSection />;

  const name = set?.name ?? 'Featured';
  const speed = set?.animationSpeed ?? DEFAULT_SPEED;
  const gradient = set?.gradient ?? false;

  return (
    <section
      ref={sectionRef}
      className="hero-engine"
      aria-label={name}
      onTouchStart={() => applyPaused(true)}
      onTouchEnd={() => applyPaused(false)}
    >
      {isMobile ? (
        <MobileCarousel panels={panels} paused={paused} speed={speed} gradient={gradient} setName={name} />
      ) : (
        <div className="hero-panels">
          {panels.map((panel, index) => (
            <PanelView
              key={String(panel._id ?? index)}
              panel={panel}
              index={index}
              paused={paused}
              isMobile={false}
              speed={speed}
              gradient={gradient}
              setName={name}
              phaseOffsetMs={index * 1500}
            />
          ))}
        </div>
      )}
    </section>
  );
}
