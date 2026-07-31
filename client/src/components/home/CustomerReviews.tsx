import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { reviewService } from '@/services/review.service';
import { RatingStars } from '@/components/shared/RatingStars';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomerReviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', 'featured'],
    queryFn: () => reviewService.featured(6),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <section className="bg-background py-16 sm:py-24">
        <div className="container-lux">
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = reviews ?? [];
  if (items.length === 0) return null;

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Client words"
          title="From Our Clients"
          description="Quiet luxury, spoken aloud — verified words from the maison's clientele."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.slice(0, 3).map((review, index) => (
            <motion.figure
              key={String(review._id)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col gap-5 border border-border bg-secondary/40 p-8"
            >
              <div className="flex items-center justify-between">
                <RatingStars rating={review.rating} size={14} />
                {review.verifiedPurchase && (
                  <span className="text-[9px] font-medium uppercase tracking-lux-sm text-accent">Verified</span>
                )}
              </div>
              <blockquote className="text-sm leading-7 text-foreground/80">{review.comment}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-border/60 pt-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground font-display text-xs text-background">
                  {review.userName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-lux-sm text-foreground">{review.userName}</p>
                  <p className="text-[10px] text-muted-foreground">{review.helpfulVotes} found this helpful</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
