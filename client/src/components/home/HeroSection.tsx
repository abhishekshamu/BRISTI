import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import { useQuery } from '@tanstack/react-query';
import { siteService } from '@/services/site.service';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1920&auto=format&fit=crop';

const DEFAULT_PROPS = {
  eyebrow: 'The Autumn–Winter 2026 Collection',
  headingLine1: 'Silhouettes in',
  headingLine2: 'whispers of gold',
  subheading:
    'Crafted from rare fabrics and precise tailoring — BRISTI dresses the art of quiet luxury. Each piece, a study in restraint.',
  image: FALLBACK_IMAGE,
  primaryCta: { label: 'Explore the collection', to: '/collections' },
  secondaryCta: { label: 'Shop new arrivals', to: '/shop' },
};

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: siteService.getSettings,
    staleTime: 1000 * 60 * 5,
  });

  const heroSection = settings?.homepageSections?.find((s) => s.type === 'hero' && s.isActive !== false);
  const props = { ...DEFAULT_PROPS, ...(heroSection?.props ?? {}) };
  const heroImage = props.image || FALLBACK_IMAGE;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ delay: 0.3 });
      timeline
        .fromTo('[data-hero-line]', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.14 })
        .fromTo('[data-hero-eyebrow]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .fromTo('[data-hero-cta]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 }, '-=0.5')
        .fromTo('[data-hero-float]', { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.4');
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative flex min-h-[92vh] items-center overflow-hidden bg-[#0a0a0a] pt-20 lg:min-h-screen">
      <img
        src={heroImage}
        alt={props.headingLine1}
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,162,39,0.08),transparent_60%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/50 lg:bg-gradient-to-r lg:from-black/80 lg:via-transparent lg:to-black/30" aria-hidden="true" />

      <div className="container-lux relative z-10 py-24">
        <div className="max-w-3xl overflow-hidden">
          <span data-hero-eyebrow className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux text-accent">
            <span className="h-px w-10 bg-accent" /> {props.eyebrow}
          </span>
          <h1 className="font-display font-medium leading-[1.02] text-white">
            <span data-hero-line className="block text-[13vw] sm:text-6xl lg:text-7xl xl:text-8xl">{props.headingLine1}</span>
            <span data-hero-line className="block text-[13vw] sm:text-6xl lg:text-7xl xl:text-8xl">
              <em className="text-gradient-gold not-italic">{props.headingLine2}</em>
            </span>
          </h1>
        </div>

        <p className="mt-8 max-w-md text-sm leading-7 text-white/60 sm:text-base sm:leading-8">{props.subheading}</p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link data-hero-cta to={props.primaryCta?.to ?? '/collections'} className="btn-lux-gold">
            {props.primaryCta?.label ?? 'Explore the collection'} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link data-hero-cta to={props.secondaryCta?.to ?? '/shop'} className="btn-lux-white">
            {props.secondaryCta?.label ?? 'Shop new arrivals'}
          </Link>
        </div>
      </div>

      <div data-hero-float className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-pulse-soft lg:block">
        <ChevronDown className="h-6 w-6 text-white/40" />
      </div>
    </section>
  );
}
