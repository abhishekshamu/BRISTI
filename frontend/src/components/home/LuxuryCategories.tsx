import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Skeleton } from '@/components/ui/skeleton';
import { getImageUrl } from '@/lib/utils';

export function LuxuryCategories() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  const active = (categories ?? []).filter((c) => c.isActive !== false);
  // Mobile shows the first 4 in a 2x2 grid; the 4th card is CSS-hidden on
  // tablet/desktop so their existing 3-card layouts stay exactly as before.
  const featured = active.slice(0, 4);
  const showViewAll = active.length > 4;

  if (isLoading) {
    return (
      <section className="bg-secondary/40 pt-12 pb-12 sm:pb-20">
        <div className="container-lux">
          <div className="lux-cats-grid">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className={`aspect-[4/5] w-full${i === 3 ? ' lux-cat-mobile-only' : ''}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="bg-secondary/40 pt-12 pb-12 sm:pb-20">
      <div className="container-lux">
        <SectionHeading
          eyebrow="The ateliers"
          title="Featured Categories"
          description="Each category, a discipline — considered fabrics, obsessive detailing, and proportions refined over decades."
          link={{ label: 'Shop all categories', to: '/shop' }}
        />
        <div className="lux-cats-grid mt-5 md:mt-10">
          {featured.map((category, index) => {
            const image = getImageUrl(category.image);
            return (
              <motion.div
                key={String(category._id)}
                className={index === 3 ? 'lux-cat-mobile-only' : undefined}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: index * 0.12, ease: 'easeOut' }}
              >
                <Link to={`/shop?category=${category.slug}`} className="lux-cat-card group relative block aspect-[4/5] overflow-hidden bg-secondary">
                  {image ? (
                    <img
                      src={image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover md:transition-transform md:duration-[1.2s] md:ease-out md:group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent md:from-black/70 md:via-black/10 md:to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-4 md:gap-3 md:p-8">
                    <p className="hidden text-[10px] font-medium uppercase tracking-lux-sm text-[var(--on-ink-dim)] md:block">{category.description || 'The Maison'}</p>
                    <div className="flex items-end justify-center gap-2 md:items-center md:justify-between">
                      <h3 className="line-clamp-2 text-center font-display text-[17px] font-semibold leading-snug text-white md:line-clamp-none md:text-left md:font-medium md:text-3xl md:text-[var(--on-ink)]">{category.name}</h3>
                      <span className="hidden h-8 w-8 shrink-0 items-center justify-center border border-white/40 bg-black/20 text-white md:flex md:h-10 md:w-10 md:border-[var(--on-ink)]/30 md:bg-transparent md:text-[var(--on-ink)] md:transition-all md:duration-300 md:group-hover:border-accent md:group-hover:bg-accent">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        {showViewAll && (
          <div className="lux-cats-view-all mt-10 justify-center">
            <Link to="/shop" className="btn-lux-outline">
              View All Categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
