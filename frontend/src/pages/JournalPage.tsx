import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { blogService } from '@/services/blog.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { Pagination } from '@/components/ui/pagination';
import { usePageMeta } from '@/lib/seo';
import { calculateReadingTime, formatDate, getImageUrl } from '@/lib/utils';
import { useBrandName } from '@/context/SettingsContext';
import type { BlogPost } from '@shared/types';

const PAGE_SIZE = 12;

export default function JournalPage() {
  const brandName = useBrandName();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');
  const [page, setPage] = useState(1);
  usePageMeta({ title: `The Journal — ${brandName}`, description: `Stories from the maison: craftsmanship, culture and the art of dressing well.` });

  const { data: tagsPage } = useQuery({
    queryKey: ['blogs', 'tags'],
    queryFn: () => blogService.list({ limit: 100 }),
    staleTime: 1000 * 60 * 10,
  });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const post of tagsPage?.data ?? []) for (const tag of post.tags ?? []) tags.add(tag);
    return Array.from(tags).slice(0, 10);
  }, [tagsPage]);

  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: ['blogs', 'list', activeTag, page],
    queryFn: async () => {
      if (activeTag) {
        const posts = await blogService.byTag(activeTag);
        return { data: posts, pagination: { total: posts.length, page: 1, limit: posts.length, pages: 1, hasNext: false, hasPrev: false } };
      }
      return blogService.list({ page, limit: PAGE_SIZE });
    },
    staleTime: 1000 * 60 * 5,
  });

  const posts = pageData?.data ?? [];
  const pages = pageData?.pagination?.pages ?? 1;
  const showFeatured = !activeTag && page === 1;

  const featured = showFeatured ? posts[0] : undefined;
  const rest = showFeatured ? posts.slice(1) : posts;

  const selectTag = (tag: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (tag) next.set('tag', tag);
    else next.delete('tag');
    setSearchParams(next, { replace: false });
    setPage(1);
  };

  const toggleTag = (tag: string) => selectTag(activeTag === tag ? null : tag);

  return (
    <>
      <PageHeader
        eyebrow="Stories & Ideas"
        title="The Journal"
        description="Notes from the atelier — on craft, fabric, culture and the art of dressing well."
        breadcrumb={[{ label: 'Journal' }]}
      />

      {allTags.length > 0 && (
        <div className="container-lux -mt-4 flex flex-wrap gap-2 pb-4">
          <button
            type="button"
            onClick={() => selectTag(null)}
            className={`border px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${!activeTag ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground'}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`border px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${activeTag === tag ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <section className="bg-background pb-24 pt-6">
        <div className="container-lux">
          {isLoading ? (
            <div className="flex flex-col gap-14">
              <Skeleton className="aspect-[21/9] w-full" />
              <div className="grid gap-10 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <ErrorState message={(error as Error)?.message ?? 'Could not load the journal'} onRetry={() => refetch()} />
          ) : posts.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">The journal is being written. Stories will appear here soon.</p>
          ) : (
            <>
              {featured && (
                <motion.article
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="group mb-16"
                >
                  <Link to={`/journal/${featured.slug}`} className="grid overflow-hidden lg:grid-cols-2">
                    <div className="aspect-[16/10] overflow-hidden bg-secondary lg:aspect-auto">
                      {getImageUrl(featured.featuredImage) ? (
                        <img src={getImageUrl(featured.featuredImage) ?? undefined} alt={featured.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                          <span className="font-display text-3xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-5 border border-l-0 border-border p-10 lg:p-16">
                      <span className="flex items-center gap-2 text-[10px] uppercase tracking-lux-sm text-accent">
                        <span className="h-px w-8 bg-accent" /> Featured story
                      </span>
                      <h2 className="font-display text-3xl font-medium leading-tight transition-colors group-hover:text-accent sm:text-4xl">
                        {featured.title}
                      </h2>
                      <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{featured.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(featured.publishedAt ?? featured.createdAt ?? new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {calculateReadingTime(featured.content)} min read
                        </span>
                        <span>By {featured.author}</span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              )}

              {rest.length > 0 && (
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post: BlogPost, index: number) => (
                    <motion.article
                      key={String(post._id)}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
                    >
                      <Link to={`/journal/${post.slug}`} className="group block">
                        <div className="aspect-[4/3] overflow-hidden bg-secondary">
                          {getImageUrl(post.featuredImage) ? (
                            <img src={getImageUrl(post.featuredImage) ?? undefined} alt={post.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                              <span className="font-display text-xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2.5 pt-5">
                          <span className="flex items-center gap-2 text-[10px] uppercase tracking-lux-sm text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(post.publishedAt ?? post.createdAt ?? new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
                            <span>·</span>
                            {calculateReadingTime(post.content)} min read
                          </span>
                          <h3 className="font-display text-2xl font-medium leading-snug transition-colors group-hover:text-accent">{post.title}</h3>
                          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              )}
            </>
          )}
          {!isLoading && !error && posts.length > 0 && <Pagination page={page} pages={pages} onPageChange={setPage} />}
        </div>
      </section>
    </>
  );
}
