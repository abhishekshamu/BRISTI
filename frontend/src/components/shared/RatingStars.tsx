import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingStars({ rating, count, size = 14, className }: { rating?: number; count?: number; size?: number; className?: string }) {
  const value = rating ?? 0;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            style={{ width: size, height: size }}
            className={cn(
              'shrink-0',
              index < Math.round(value) ? 'fill-accent text-accent' : 'fill-muted text-muted-foreground/30',
            )}
          />
        ))}
      </div>
      {typeof count === 'number' && count > 0 && (
        <span className="text-xs text-muted-foreground">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}
