import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Skeleton } from '@/components/ui/skeleton';
import { getImageUrl } from '@/lib/utils';
import type { Collection } from '@shared/types';

export function FeaturedCollections() {
  // Active + Featured + sorted by Display Order + limit 3 (server-side).
  // Polls so admin changes (featured, order, active, image, title) appear
  // on the homepage without a manual refresh.
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections', 'featured'],
    queryFn: () => catalogService.featuredCollections(3),
    staleTime: 0,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <section className="bg-secondary/40 py-16 sm:py-24">
        <div className="container-lux">
          <div className="grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const featured = collections ?? [];
  if (featured.length === 0) return null;

  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Curated for you"
          title="The Collections"
          description="Three worlds of the maison — each one a study in form, fabric and light."
          link={{ label: 'View all collections', to: '/collections' }}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featured.map((collection: Collection, index) => {
            const image = getImageUrl(collection.image ?? collection.bannerImage);
            return (
              <motion.div
                key={String(collection._id)}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: index * 0.12, ease: 'easeOut' }}
              >
                <Link to={`/collection/${collection.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-secondary">
                  {image ? (
                    <img
                      src={image}
                      alt={collection.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8">
                    <p className="text-[10px] font-medium uppercase tracking-lux-sm text-[var(--on-ink-dim)]">
                      {collection.shortDescription ?? collection.description ?? 'The Maison'}
                    </p>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-3xl font-medium text-[var(--on-ink)]">{collection.name}</h3>
                      <span className="flex h-10 w-10 items-center justify-center border border-[var(--on-ink)]/30 text-[var(--on-ink)] transition-all duration-300 group-hover:border-accent group-hover:bg-accent">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
