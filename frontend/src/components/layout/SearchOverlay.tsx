import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productService } from '@/services/product.service';
import { useUIStore } from '@/store/useUIStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useBrandName } from '@/context/SettingsContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getImageUrl } from '@/lib/utils';
import { ROUTES } from '@shared/constants';
import type { Product } from '@shared/types';

export function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useUIStore();
  const brandName = useBrandName();
  const { formatPrice } = useCurrency();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen, closeSearch]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => productService.search({ q: debouncedQuery, limit: 8 }),
    enabled: isSearchOpen && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 60,
  });

  const goToSearch = (searchQuery: string) => {
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[var(--backdrop-strong)] px-4 pt-24 backdrop-blur-sm sm:pt-32"
          onClick={closeSearch}
        >
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-2xl bg-[var(--search-result-bg)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <form
              className="flex items-center gap-4 border-b border-border px-6 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim()) goToSearch(query.trim());
              }}
            >
              {isFetching ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : <Search className="h-5 w-5 text-muted-foreground" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for pieces, silhouettes, materials…"
                className="flex-1 bg-transparent font-display text-xl outline-none placeholder:text-muted-foreground/50"
              />
              <button type="button" onClick={closeSearch} className="text-[10px] uppercase tracking-lux-sm text-muted-foreground transition-colors hover:text-foreground">
                Esc
              </button>
            </form>

            <div className="max-h-[50vh] overflow-y-auto">
              {!debouncedQuery && (
                <div className="px-6 py-6">
                  <p className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-lux-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> Trending searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Silk dress', 'Tailored blazer', 'Cashmere', 'Evening wear', 'Leather'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="border border-border px-4 py-2 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {debouncedQuery.trim().length >= 2 && (
                <ul>
                  {(results ?? []).slice(0, 6).map((product: Product) => (
                    <li key={String(product._id)}>
                      <button
                        type="button"
                        onClick={() => {
                          closeSearch();
                          navigate(ROUTES.PRODUCT_DETAILS(product.slug));
                        }}
                        className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-secondary"
                      >
                        <img
                          src={getImageUrl(product.images?.find((i) => i.isFeatured)?.url ?? product.images?.[0]?.url) ?? undefined}
                          alt={product.name}
                          className="h-16 w-14 shrink-0 bg-secondary object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{product.brand || brandName}</p>
                        </div>
                        <span className="text-sm font-medium">{formatPrice(product.price)}</span>
                      </button>
                    </li>
                  ))}
                  {results && results.length === 0 && (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No results for “{debouncedQuery}”.</p>
                  )}
                </ul>
              )}

              {debouncedQuery.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={() => goToSearch(debouncedQuery.trim())}
                  className="block w-full border-t border-border px-6 py-4 text-left text-xs font-medium uppercase tracking-lux-sm text-accent transition-colors hover:bg-secondary"
                >
                  View all results for “{debouncedQuery.trim()}” →
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
