import { useInfiniteQuery } from '@tanstack/react-query';
import { productService, type ProductQueryParams } from '@/services/product.service';
import type { Product } from '@shared/types';

export interface ProductListingOptions {
  categorySlugs?: string[];
  collectionId?: string;
  collectionSlugs?: string[];
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  // Independent marketing flags — combinable (AND).
  newArrival?: boolean;
  bestSeller?: boolean;
  trending?: boolean;
  sale?: boolean;
  featured?: boolean;
  recommended?: boolean;
  exclusive?: boolean;
  limitedEdition?: boolean;
  editorsPick?: boolean;
  premiumCollection?: boolean;
  enabled?: boolean;
}

export function useProductListing({
  categorySlugs,
  collectionId,
  collectionSlugs,
  search,
  sort,
  order,
  minPrice,
  maxPrice,
  newArrival,
  bestSeller,
  trending,
  sale,
  featured,
  recommended,
  exclusive,
  limitedEdition,
  editorsPick,
  premiumCollection,
  enabled = true,
}: ProductListingOptions) {
  const params = (page: number): ProductQueryParams => ({
    page,
    limit: 20,
    // Category slugs are sent as repeated `categories` params (OR filter).
    // The backend resolves slugs to ids and applies a single $in query.
    categories: categorySlugs && categorySlugs.length > 0 ? categorySlugs : undefined,
    collection: collectionId,
    collections: collectionSlugs && collectionSlugs.length > 0 ? collectionSlugs.join(',') : undefined,
    sort,
    order,
    newArrival,
    bestSeller,
    trending,
    sale,
    featured,
    recommended,
    exclusive,
    limitedEdition,
    editorsPick,
    premiumCollection,
    minPrice: minPrice && minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice && maxPrice > 0 ? maxPrice : undefined,
  });

  const baseKey = search !== undefined ? ['products', 'search', search] : ['products', 'list'];

  const searchQuery = useInfiniteQuery({
    queryKey: [
      ...baseKey,
      categorySlugs?.join(','),
      collectionId,
      collectionSlugs?.join(','),
      sort,
      order,
      newArrival,
      bestSeller,
      trending,
      sale,
      featured,
      recommended,
      exclusive,
      limitedEdition,
      editorsPick,
      premiumCollection,
      minPrice,
      maxPrice,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      if (search !== undefined) {
        const results = await productService.search({ q: search, page: pageParam, limit: 20 });
        return { items: results, hasMore: results.length === 20, next: pageParam + 1 };
      }
      return productService.list(params(pageParam));
    },
    initialPageParam: 1,
    enabled,
    retry: 2,
    refetchOnWindowFocus: false,
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
