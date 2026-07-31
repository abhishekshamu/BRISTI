import { useInfiniteQuery } from '@tanstack/react-query';
import { productService, type ProductQueryParams } from '@/services/product.service';
import type { Product } from '@shared/types';

export interface ProductListingOptions {
  categoryIds?: string[];
  collectionId?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  enabled?: boolean;
}

export function useProductListing({ categoryIds, collectionId, search, sort, order, minPrice, maxPrice, enabled = true }: ProductListingOptions) {
  const params = (page: number): ProductQueryParams => ({
    page,
    limit: 20,
    category: categoryIds && categoryIds.length > 0 ? categoryIds.join(',') : undefined,
    collection: collectionId,
    sort,
    order,
    minPrice: minPrice && minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice && maxPrice > 0 ? maxPrice : undefined,
  });

  const baseKey = search !== undefined ? ['products', 'search', search] : ['products', 'list'];

  const searchQuery = useInfiniteQuery({
    queryKey: [...baseKey, categoryIds?.join(','), collectionId, sort, order, minPrice, maxPrice],
    queryFn: async ({ pageParam = 1 }) => {
      if (search !== undefined) {
        const results = await productService.search({ q: search, page: pageParam, limit: 20 });
        return { items: results, hasMore: results.length === 20, next: pageParam + 1 };
      }
      return productService.list(params(pageParam));
    },
    initialPageParam: 1,
    enabled,
    getNextPageParam: (lastPage) => {
      if ('hasMore' in lastPage && typeof lastPage.hasMore === 'boolean') {
        return lastPage.hasMore ? (lastPage as { next?: number }).next ?? undefined : undefined;
      }
      const pagination = (lastPage as { pagination?: { page: number; pages: number } }).pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2,
  });

  const items: Product[] =
    (searchQuery.data?.pages ?? []).flatMap((page) =>
      'items' in page ? (page as { items: Product[] }).items : (page as { data: Product[] }).data ?? [],
    ) ?? [];

  return {
    items,
    isLoading: searchQuery.isPending,
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    hasNextPage: searchQuery.hasNextPage ?? false,
    fetchNextPage: searchQuery.fetchNextPage,
    refetch: searchQuery.refetch,
    error: searchQuery.error,
  };
}
