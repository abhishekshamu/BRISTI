import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.2,
  rootMargin = '400px',
}: UseInfiniteScrollOptions): (node: HTMLElement | null) => void {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    onLoadMoreRef.current();
  }, [hasMore, isLoading]);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) loadMore();
        },
        { threshold, rootMargin },
      );
      observerRef.current.observe(node);
    },
    [loadMore, threshold, rootMargin],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return setRef;
}
