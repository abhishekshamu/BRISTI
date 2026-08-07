import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/services/catalog.service';
import { getImageUrl } from '@/lib/utils';
import type { Collection } from '@shared/types';

interface EditorialBannerProps {
  props?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    image?: string;
    primaryCta?: { label?: string; url?: string };
    secondaryCta?: { label?: string; url?: string };
  };
}

export function EditorialBanner({ props }: EditorialBannerProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  const { data: collections } = useQuery({
    queryKey: ['collections', 'current'],
    queryFn: catalogService.currentCollections,
    staleTime: 1000 * 60 * 30,
  });

  // Editorial content is CMS-configured; nothing is rendered without it.
  if (!props?.title) return null;

  const collection = (collections ?? [])[0] as Collection | undefined;
  const image = getImageUrl(props.image) || getImageUrl(collection?.image ?? collection?.bannerImage);
  const primaryCta = props.primaryCta?.url ? { label: props.primaryCta.label || 'Our story', to: props.primaryCta.url } : { label: 'Our story', to: '/about' };
  const secondaryCta = props.secondaryCta?.url ? { label: props.secondaryCta.label || 'Read the journal', to: props.secondaryCta.url } : { label: 'Read the journal', to: '/journal' };

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--ink)]">
      <div className="grid min-h-[560px] lg:grid-cols-2">
        <div className="relative order-2 overflow-hidden lg:order-1">
          {image ? (
            <motion.img
              src={image}
              alt={props?.title ?? collection?.name ?? 'BRISTI editorial'}
              style={{ y: imageY }}
              className="absolute inset-0 h-[120%] w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--ink-soft)] to-[var(--ink)]">
              <span className="font-display text-4xl tracking-[0.3em] text-[var(--on-ink-faint)]">BRISTI</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/70" />
        </div>

        <div className="relative order-1 flex items-center p-8 sm:p-16 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-xl"
          >
            <span className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux text-accent">
              <span className="h-px w-10 bg-accent" /> {props.eyebrow || 'The Atelier Edit'}
            </span>
            <h2 className="font-display text-4xl font-medium leading-tight text-[var(--on-ink)] sm:text-5xl lg:text-6xl">
              {props.title}
            </h2>
            {props.description && (
              <p className="mt-6 text-sm leading-7 text-[var(--on-ink-dim)] sm:text-base sm:leading-8">
                {props.description}
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to={primaryCta.to} className="btn-lux-white">
                {primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={secondaryCta.to} className="btn-lux-outline border-[var(--on-ink)]/30 text-[var(--on-ink)] hover:bg-[var(--btn-white-bg)] hover:text-[var(--btn-white-text)]">
                {secondaryCta.label}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
