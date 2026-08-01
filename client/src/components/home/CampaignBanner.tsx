import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { siteService } from '@/services/site.service';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1920&auto=format&fit=crop';

export function CampaignBanner() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: siteService.getSettings,
    staleTime: 1000 * 60 * 5,
  });

  const section = settings?.homepageSections?.find((s) => s.type === 'campaign-banner' && s.isActive !== false);
  if (!section) return null;

  const props = section.props ?? {};
  const image = props.image || FALLBACK_IMAGE;

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container-lux">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative aspect-[16/9] overflow-hidden bg-[var(--ink)] lg:aspect-[21/9]"
        >
          <img src={image} alt={props.title || 'Campaign'} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 p-10 text-center sm:p-16">
            <span className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux text-accent">
              <span className="h-px w-8 bg-accent" />
              {props.eyebrow || 'The New Season'}
              <span className="h-px w-8 bg-accent" />
            </span>
            <h2 className="max-w-3xl font-display text-4xl font-medium tracking-wide text-[var(--on-ink)] sm:text-5xl lg:text-6xl">
              {props.title || 'Autumn–Winter 2026'}
            </h2>
            {props.description && (
              <p className="max-w-xl text-sm leading-7 text-[var(--on-ink-dim)] sm:text-base">{props.description}</p>
            )}
            {props.cta && (
              <Link to={props.cta.to ?? '/collections'} className="btn-lux-gold group mt-2">
                {props.cta.label ?? 'Discover the collection'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
