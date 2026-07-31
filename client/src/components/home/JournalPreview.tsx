import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { blogService } from '@/services/blog.service';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getImageUrl } from '@/lib/utils';

export function JournalPreview() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blogs', 'recent'],
    queryFn: () => blogService.recent(3),
    staleTime: 1000 * 60 * 10,
  });

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading eyebrow="The Journal" title="Notes from the maison" link={{ label: 'Read the journal', to: '/journal' }} />

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {isLoading
            ? [0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))
            : (posts ?? []).map((post, index) => {
                const image = getImageUrl(post.featuredImage);
                return (
                  <motion.article
                    key={String(post._id)}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Link to={`/journal/${post.slug}`} className="group block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                        {image ? (
                          <img
                            src={image}
                            alt={post.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                            <span className="font-display text-xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 pt-5">
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-lux-sm text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(post.publishedAt ?? post.createdAt ?? new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <h3 className="font-display text-2xl font-medium leading-snug transition-colors group-hover:text-accent">{post.title}</h3>
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                        <span className="mt-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-lux-sm text-accent">
                          Read story <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
        </div>
      </div>
    </section>
  );
}
