import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { productService } from '@/services/product.service';
import { useProductListing } from '@/hooks/useProductListing';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@shared/types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', sort: 'createdAt', order: 'desc' },
  { value: 'price-asc', label: 'Price: Low to High', sort: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', sort: 'price', order: 'desc' },
  { value: 'rating', label: 'Best Rated', sort: 'rating.average', order: 'desc' },
  { value: 'name-asc', label: 'Name: A to Z', sort: 'name', order: 'asc' },
] as const;

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  usePageMeta({ title: 'Shop All — BRISTI' });

  const selectedSlugs = useMemo(() => {
    const raw = searchParams.get('category');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const sortValue = searchParams.get('sort') ?? 'newest';
  const minPrice = Number(searchParams.get('min') ?? '');
  const maxPrice = Number(searchParams.get('max') ?? '');
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 1000]);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  const flatCategories = useMemo(() => {
    const flatten = (nodes: Array<{ children?: unknown[] } & { _id: unknown; slug: string; name: string }>, acc: Array<{ _id: unknown; slug: string; name: string }> = []) => {
      for (const node of nodes) {
        acc.push({ _id: node._id, slug: node.slug, name: node.name });
        if (node.children?.length) flatten(node.children as never, acc);
      }
      return acc;
    };
    return flatten((categories ?? []) as never);
  }, [categories]);

  const selectedCategoryIds = useMemo(
    () => flatCategories.filter((category) => selectedSlugs.includes(category.slug)).map((category) => String(category._id)),
    [flatCategories, selectedSlugs],
  );

  const sortConfig = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];

  const multiCategory = selectedCategoryIds.length > 1;

  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    categoryIds: multiCategory ? undefined : selectedCategoryIds,
    sort: sortConfig.sort,
    order: sortConfig.order,
    minPrice: Number.isNaN(minPrice) ? undefined : minPrice,
    maxPrice: Number.isNaN(maxPrice) ? undefined : maxPrice,
    enabled: !multiCategory,
  });

  const categoryQueries = useQueries({
    queries: selectedCategoryIds.map((id) => ({
      queryKey: ['products', 'byCategory', id, sortConfig.sort, sortConfig.order],
      queryFn: () => productService.byCategory(id, { page: 1, limit: 20, sort: sortConfig.sort, order: sortConfig.order }),
      enabled: multiCategory,
    })),
  });

  const multiItems = useMemo(() => {
    if (!multiCategory) return [];
    const seen = new Set<string>();
    const merged: Product[] = [];
    for (const query of categoryQueries) {
      for (const product of query.data ?? []) {
        const key = String(product._id);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(product);
        }
      }
    }
    return merged;
  }, [multiCategory, categoryQueries]);

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === '0') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const toggleCategory = (slug: string) => {
    const next = selectedSlugs.includes(slug) ? selectedSlugs.filter((s) => s !== slug) : [...selectedSlugs, slug];
    updateSearchParams({ category: next.length > 0 ? next.join(',') : null });
  };

  const FiltersPanel = (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="mb-5 text-xs font-medium uppercase tracking-lux-sm">Categories</h3>
        <div className="flex flex-col gap-4">
          {flatCategories.map((category) => (
            <label key={String(category._id)} className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <Checkbox checked={selectedSlugs.includes(category.slug)} onCheckedChange={() => toggleCategory(category.slug)} />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-5 text-xs font-medium uppercase tracking-lux-sm">Price</h3>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={priceRange}
          onValueChange={(value) => {
            setPriceRange(value as [number, number]);
            updateSearchParams({ min: String(value[0]), max: String(value[1]) });
          }}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>

      {selectedSlugs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSlugs.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => toggleCategory(slug)}
              className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              {flatCategories.find((category) => category.slug === slug)?.name ?? slug}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="The Collection"
        title="Shop All"
        description="Every piece, every silhouette — the complete BRISTI wardrobe, presented without compromise."
        breadcrumb={[{ label: 'Shop' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="flex items-center justify-between border-y border-border py-4">
            <p className="text-xs uppercase tracking-lux-sm text-muted-foreground">
              {isLoading || (multiCategory && categoryQueries.some((query) => query.isPending))
                ? 'Curating…'
                : `${(multiCategory ? multiItems : items).length} piece${(multiCategory ? multiItems : items).length === 1 ? '' : 's'}`}
            </p>
            <div className="flex items-center gap-3">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="px-6 pb-8">{FiltersPanel}</div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-3">
                <Label className="hidden sm:block">Sort</Label>
                <Select value={sortValue} onValueChange={(value) => updateSearchParams({ sort: value })}>
                  <SelectTrigger className="h-10 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-[240px_1fr]">
            <aside className="hidden lg:block">{FiltersPanel}</aside>

            <div>
              {isLoading || (multiCategory && categoryQueries.some((query) => query.isPending)) ? (
                <ProductGridSkeleton count={8} />
              ) : (multiCategory ? categoryQueries.find((query) => query.isError)?.error : error) ? (
                <ErrorState
                  message={(multiCategory ? categoryQueries.find((query) => query.isError)?.error : error) instanceof Error
                    ? ((multiCategory ? categoryQueries.find((query) => query.isError)?.error : error) as Error).message
                    : 'Failed to load products'}
                  onRetry={() => (multiCategory ? categoryQueries.forEach((query) => query.refetch()) : refetch())}
                />
              ) : (multiCategory ? multiItems : items).length === 0 ? (
                <div className="py-24 text-center">
                  <p className="font-display text-3xl font-medium">No pieces found</p>
                  <p className="mt-3 text-sm text-muted-foreground">Try adjusting your filters to see more of the collection.</p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSearchParams({}, { replace: true });
                      setPriceRange([0, 1000]);
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <>
                  <ProductGrid products={multiCategory ? multiItems : items} columns={3} />
                  {!multiCategory && (
                    <>
                      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                      {isFetchingNextPage && (
                        <p className="py-8 text-center text-xs uppercase tracking-lux-sm text-muted-foreground">Loading more…</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
