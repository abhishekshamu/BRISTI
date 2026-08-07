import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { useProductListing } from '@/hooks/useProductListing';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { PromotionBanner, useActivePromotionBanner } from '@/components/promotion/PromotionBanner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/seo';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { useBrandName } from '@/context/SettingsContext';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', sort: 'createdAt', order: 'desc' },
  { value: 'price-asc', label: 'Price: Low to High', sort: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', sort: 'price', order: 'desc' },
  { value: 'rating', label: 'Best Rated', sort: 'rating.average', order: 'desc' },
  { value: 'name-asc', label: 'Name: A to Z', sort: 'name', order: 'asc' },
] as const;

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const brandName = useBrandName();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedSlugs = useMemo(() => {
    const raw = searchParams.get('category');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const singleCategorySlug = selectedSlugs.length === 1 ? selectedSlugs[0] : undefined;
  const isCategoryLanding = Boolean(singleCategorySlug);

  const sortValue = searchParams.get('sort') ?? 'newest';
  const minPrice = Number(searchParams.get('min') ?? '');
  const maxPrice = Number(searchParams.get('max') ?? '');
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 1000]);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  const { data: selectedCategory } = useQuery({
    queryKey: ['categories', 'slug', singleCategorySlug],
    queryFn: () => catalogService.getCategoryBySlug(singleCategorySlug as string),
    enabled: Boolean(singleCategorySlug),
  });

  const categoryBanner = isCategoryLanding ? getImageUrl(selectedCategory?.bannerImage ?? selectedCategory?.image) : null;
  const promoBanner = useActivePromotionBanner(singleCategorySlug);

  usePageMeta({
    title: isCategoryLanding
      ? `${brandName} | ${selectedCategory?.name ?? singleCategorySlug}`
      : `Shop All — ${brandName}`,
    description: selectedCategory?.subtitle ?? selectedCategory?.seo?.description ?? selectedCategory?.description,
    image: categoryBanner ?? undefined,
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

  const sortConfig = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];

  // All selected categories are sent together as repeated `categories`
  // params (OR filter); the backend applies a single $in query, so the
  // result is the UNION of every selected category's products.
  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    categorySlugs: selectedSlugs,
    sort: sortConfig.sort,
    order: sortConfig.order,
    minPrice: Number.isNaN(minPrice) ? undefined : minPrice,
    maxPrice: Number.isNaN(maxPrice) ? undefined : maxPrice,
  });

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

  const categoryName = isCategoryLanding ? selectedCategory?.name ?? 'Loading…' : undefined;

  const loadedCount = items.length;
  const productCount = isCategoryLanding
    ? selectedCategory?.productCount ?? (isLoading ? undefined : loadedCount)
    : loadedCount;
  const productCountLabel =
    productCount === undefined
      ? 'Curating…'
      : `${productCount} Product${productCount === 1 ? '' : 's'}`;
  const isCurating = isLoading;

  return (
    <>
      <section className="border-b border-border bg-background pt-[90px] lg:pt-[106px]">
        <div className="container-lux py-5 sm:py-6">
          <div className="flex items-start justify-between gap-8">
            <div className="flex min-w-0 flex-col gap-3">
              <Breadcrumb
                items={
                  isCategoryLanding
                    ? [
                        { label: 'Home', to: '/' },
                        { label: 'Shop', to: '/shop' },
                        { label: selectedCategory?.name ?? (singleCategorySlug as string) },
                      ]
                    : [
                        { label: 'Home', to: '/' },
                        { label: 'Shop' },
                      ]
                }
              />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="font-display text-2xl font-medium tracking-wide sm:text-3xl">
                  {categoryName ?? 'Shop All'}
                </h1>
                <p className="text-xs uppercase tracking-lux-sm text-muted-foreground">
                  {isCurating ? 'Curating…' : productCountLabel}
                </p>
              </div>
              {(isCategoryLanding
                ? selectedCategory?.subtitle ?? selectedCategory?.description
                : 'Every piece, every silhouette — the complete BRISTI wardrobe, presented without compromise.') && (
                <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {isCategoryLanding
                    ? selectedCategory?.subtitle ?? selectedCategory?.description
                    : 'Every piece, every silhouette — the complete BRISTI wardrobe, presented without compromise.'}
                </p>
              )}
            </div>
            <div className="hidden shrink-0 lg:block">
              <div className="flex items-center gap-3">
                <Label className="hidden xl:block">Sort</Label>
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
        </div>
      </section>

      {promoBanner && <PromotionBanner banner={promoBanner} />}

      <div className="sticky top-[90px] z-30 border-y border-border bg-background lg:hidden">
        <div className="container-lux flex items-center gap-3 py-3">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1">
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

          <Select value={sortValue} onValueChange={(value) => updateSearchParams({ sort: value })}>
            <SelectTrigger className="h-10 flex-1 text-xs">
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

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mt-8 grid gap-12 lg:grid-cols-[240px_1fr]">
            <aside className="hidden lg:block">{FiltersPanel}</aside>

            <div>
              {isCurating ? (
                <ProductGridSkeleton count={8} columns={3} />
              ) : error ? (
                <ErrorState
                  message={error instanceof Error ? error.message : 'Failed to load products'}
                  onRetry={() => refetch()}
                />
              ) : items.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="font-display text-3xl font-medium">No products found</p>
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
                  <ProductGrid products={items} columns={3} />
                  <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                  {isFetchingNextPage && (
                    <p className="py-8 text-center text-xs uppercase tracking-lux-sm text-muted-foreground">Loading more…</p>
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
