import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Clock, User } from 'lucide-react';
import { blogService } from '@/services/blog.service';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { calculateReadingTime, formatDate, getImageUrl } from '@/lib/utils';

export default function BlogDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog', 'slug', slug],
    queryFn: () => blogService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: related } = useQuery({
    queryKey: ['blog', 'related', post?._id],
    queryFn: () => blogService.related(String(post!._id), 3),
    enabled: Boolean(post),
  });

  usePageMeta({
    title: post ? `${post.title} — BRISTI Journal` : 'Journal — BRISTI',
    description: post?.seo?.description ?? post?.excerpt,
    image: post?.featuredImage,
    keywords: post?.seo?.keywords,
  });

  if (isLoading) {
    return (
      <div className="container-lux py-36">
        <Skeleton className="mb-8 h-6 w-48" />
        <Skeleton className="aspect-[21/10] w-full" />
        <Skeleton className="mt-10 h-12 w-2/3" />
        <Skeleton className="mt-6 h-4 w-1/3" />
        <Skeleton className="mt-10 h-72 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container-lux py-40">
        <ErrorState message={(error as Error)?.message ?? 'Story not found'} />
      </div>
    );
  }

  const image = getImageUrl(post.featuredImage);

  return (
    <article className="pb-24 pt-32 lg:pt-36">
      <div className="container-lux">
        <Breadcrumb className="mb-10" items={[{ label: 'Journal', to: '/journal' }, { label: post.title }]} />

        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">{post.category ?? 'The Journal'}</span>
          <h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl">{post.title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> By {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(post.publishedAt ?? post.createdAt ?? new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {calculateReadingTime(post.content)} min read
            </span>
          </div>
        </motion.header>

        {image && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-12 overflow-hidden"
          >
            <img src={image} alt={post.title} className="aspect-[21/10] w-full object-cover" />
          </motion.div>
        )}

        <div className="mx-auto mt-14 max-w-3xl">
          {post.gallery && post.gallery.length > 0 && (
            <div className="mb-10 grid grid-cols-2 gap-4">
              {post.gallery.map((item, index) => (
                <img key={index} src={item} alt={`${post.title} — ${index + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              ))}
            </div>
          )}

          <div className="prose-lux" dangerouslySetInnerHTML={{ __html: post.content }} />

          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8">
              {post.tags.map((tag) => (
                <Link key={tag} to={`/journal?tag=${tag}`} className="border border-border px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12">
            <Link to="/journal" className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-lux-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to the journal
            </Link>
          </div>
        </div>

        {related && related.length > 0 && (
          <div className="mt-20">
            <h2 className="mb-10 text-center font-display text-3xl font-medium">Continue reading</h2>
            <div className="grid gap-10 md:grid-cols-3">
              {related.map((item) => (
                <Link key={String(item._id)} to={`/journal/${item.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden bg-secondary">
                    {getImageUrl(item.featuredImage) ? (
                      <img src={getImageUrl(item.featuredImage) ?? undefined} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                        <span className="font-display text-xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <span className="text-[10px] uppercase tracking-lux-sm text-muted-foreground">
                      {formatDate(item.publishedAt ?? item.createdAt ?? new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h3 className="font-display text-xl font-medium leading-snug transition-colors group-hover:text-accent">{item.title}</h3>
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
