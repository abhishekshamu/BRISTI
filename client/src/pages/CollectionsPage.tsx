import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { getImageUrl } from '@/lib/utils';
import type { Collection } from '@shared/types';

export default function CollectionsPage() {
  usePageMeta({ title: 'Collections — BRISTI', description: 'Explore the world of BRISTI through our seasonal collections.' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['collections', 'all'],
    queryFn: () => catalogService.listCollections({ limit: 100 }),
    staleTime: 1000 * 60 * 30,
  });

  const collections = data?.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="The World of BRISTI"
        title="Collections"
        description="Each collection is a chapter in the maison's story — explore the worlds we have created."
        breadcrumb={[{ label: 'Collections' }]}
      />
      <section className="bg-background pb-24">
        <div className="container-lux">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={(error as Error)?.message ?? 'Failed to load collections'} onRetry={() => refetch()} />
          ) : collections.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">Collections are being prepared. Please check back soon.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection: Collection, index) => {
                const image = getImageUrl(collection.image ?? collection.bannerImage);
                return (
                  <motion.div
                    key={String(collection._id)}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
                  >
                    <Link to={`/collection/${collection.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-secondary">
                      {image ? (
                        <img
                          src={image}
                          alt={collection.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                          <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-8">
                        <h3 className="font-display text-3xl font-medium text-[var(--on-ink)]">{collection.name}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-[var(--on-ink-dim)]">
                          {collection.shortDescription ?? collection.description ?? 'Explore the collection'}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-lux-sm text-accent">
                          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
