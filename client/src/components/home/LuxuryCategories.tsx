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

  const featured = (categories ?? []).filter((c) => c.isActive !== false).slice(0, 3);

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

  if (featured.length === 0) return null;

  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading
          eyebrow="The ateliers"
          title="Luxury Categories"
          description="Each category, a discipline — considered fabrics, obsessive detailing, and proportions refined over decades."
          link={{ label: 'Shop all categories', to: '/shop' }}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featured.map((category, index) => {
            const image = getImageUrl(category.image);
            return (
              <motion.div
                key={String(category._id)}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: index * 0.12, ease: 'easeOut' }}
              >
                <Link to={`/shop?category=${category.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-secondary">
                  {image ? (
                    <img
                      src={image}
                      alt={category.name}
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
                    <p className="text-[10px] font-medium uppercase tracking-lux-sm text-white/60">{category.description || 'The Maison'}</p>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-3xl font-medium text-white">{category.name}</h3>
                      <span className="flex h-10 w-10 items-center justify-center border border-white/30 text-white transition-all duration-300 group-hover:border-accent group-hover:bg-accent">
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
