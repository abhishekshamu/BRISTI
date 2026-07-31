import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { wishlistService } from '@/services/wishlist.service';
import { useAuth } from '@/context/AuthContext';

const GUEST_WISHLIST_KEY = 'bristi_guest_wishlist';

interface WishlistContextValue {
  productIds: string[];
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  add: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  toggle: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

function loadGuestWishlist(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // corrupted guest wishlist - start fresh
  }
  return [];
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isAuthenticated) {
        setProductIds(loadGuestWishlist());
        setIsLoading(false);
        return;
      }
      try {
        const wishlist = await wishlistService.getWishlist();
        if (cancelled) return;
        const serverIds = (wishlist.productIds ?? []).map(String);
        const guestIds = loadGuestWishlist();
        if (guestIds.length > 0) {
          const missing = guestIds.filter((id) => !serverIds.includes(id));
          for (const id of missing) {
            try {
              await wishlistService.add(id);
              serverIds.push(id);
            } catch {
              // ignore individual failures
            }
          }
          localStorage.removeItem(GUEST_WISHLIST_KEY);
        }
        if (!cancelled) setProductIds(serverIds);
      } catch {
        if (!cancelled) setProductIds(loadGuestWishlist());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const isInWishlist = useCallback((productId: string) => productIds.includes(String(productId)), [productIds]);

  const add = useCallback(
    async (productId: string) => {
      const id = String(productId);
      if (!isAuthenticated) {
        setProductIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        return;
      }
      try {
        const wishlist = await wishlistService.add(id);
        setProductIds((wishlist.productIds ?? []).map(String));
      } catch {
        setProductIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    },
    [isAuthenticated],
  );

  const remove = useCallback(
    async (productId: string) => {
      const id = String(productId);
      if (!isAuthenticated) {
        setProductIds((prev) => prev.filter((p) => p !== id));
        return;
      }
      try {
        const wishlist = await wishlistService.remove(id);
        setProductIds((wishlist.productIds ?? []).map(String));
      } catch {
        setProductIds((prev) => prev.filter((p) => p !== id));
      }
    },
    [isAuthenticated],
  );

  const toggle = useCallback(
    async (productId: string) => {
      const id = String(productId);
      if (isInWishlist(id)) {
        await remove(id);
      } else {
        await add(id);
      }
    },
    [isInWishlist, add, remove],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(productIds));
    }
  }, [productIds, isAuthenticated]);

  const value = useMemo(
    () => ({ productIds, isLoading, isInWishlist, add, remove, toggle }),
    [productIds, isLoading, isInWishlist, add, remove, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
}
