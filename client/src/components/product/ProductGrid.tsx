import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ProductCard } from '@/components/product/ProductCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Product } from '@shared/types';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  pageKey?: string;
  columns?: 3 | 4;
  className?: string;
}

export function ProductGrid({ products, isLoading, hasMore, loadMore, pageKey, columns = 4, className }: ProductGridProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (pageKey) {
      queryClient.setQueryData<number>(['grid-page', pageKey], 1);
    }
  }, [pageKey, queryClient]);

  const sentinelRef = useInfiniteScroll({
    hasMore: Boolean(hasMore),
    isLoading: Boolean(isLoading),
    onLoadMore: () => loadMore?.(),
  });

  return (
    <div>
      <div className={cn('grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-3', columns === 4 && 'xl:grid-cols-4', className)}>
        {products.map((product) => (
          <ProductCard key={String(product._id)} product={product} />
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
          <Spinner size={20} />
          <span className="text-xs uppercase tracking-lux-sm">Loading</span>
        </div>
      )}

      {hasMore && !isLoading && <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />}

      {!hasMore && products.length > 0 && (
        <div className="flex items-center gap-4 py-10 text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-lux-sm">End of collection</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  );
}
