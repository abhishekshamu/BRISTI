import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { catalogService } from '@/services/catalog.service';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Skeleton } from '@/components/ui/skeleton';
import { getImageUrl } from '@/lib/utils';

export function LuxuryCategories() {
  // All active categories from Admin (backend already filters isActive: true),
  // sorted by display order. The grid grows automatically with category count.
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  const active = (categories ?? []).filter((c) => c.isActive !== false);

  if (isLoading) {
    return (
      <section className="bg-secondary/40 pt-8 pb-8 sm:pb-12">
        <div className="container-lux-wide">
          <div className="lux-cats-grid">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (active.length === 0) return null;

  return (
    <section className="bg-secondary/40 pt-8 pb-8 sm:pb-12">
      <div className="container-lux-wide">
        <SectionHeading
          eyebrow="The ateliers"
          title="Featured Categories"
          description="Each category, a discipline — considered fabrics, obsessive detailing, and proportions refined over decades."
        />
        {/* The whole grid animates as ONE unit so every row renders together —
            no per-card stagger, no rows appearing delayed or offset. */}
        <motion.div
          className="lux-cats-grid mt-4 md:mt-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {active.map((category) => {
            const image = getImageUrl(category.image);
            return (
              <Link
                key={String(category._id)}
                to={`/shop?category=${category.slug}`}
                className="lux-cat-card block"
              >
                <div className="lux-cat-media bg-secondary">
                  {image ? (
                    <img src={image} alt={category.name} loading="lazy" className="lux-cat-img" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-base tracking-[0.3em] text-muted-foreground sm:text-lg">BRISTI</span>
                    </div>
                  )}
                  <h3 className="lux-cat-name">{category.name}</h3>
                </div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
