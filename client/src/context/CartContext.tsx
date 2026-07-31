import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartService, cartItemKey, type AddToCartPayload } from '@/services/cart.service';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';
import { computeTotals } from '@/lib/pricing';
import type { Cart, CartItem } from '@shared/types';

const GUEST_CART_KEY = 'bristi_guest_cart';

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  isUpdating: boolean;
  count: number;
  subtotal: number;
  addItem: (payload: AddToCartPayload) => Promise<void>;
  updateQuantity: (item: CartItem, quantity: number) => Promise<void>;
  removeItem: (item: CartItem) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function emptyCart(): Cart {
  return {
    items: [],
    totalItems: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    couponCode: undefined,
    couponDiscount: 0,
  };
}

function loadGuestCart(): Cart {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (raw) return { ...emptyCart(), ...(JSON.parse(raw) as Cart) };
  } catch {
    // corrupted guest cart - start fresh
  }
  return emptyCart();
}

function persistGuestCart(cart: Cart): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(loadGuestCart());
      setIsLoading(false);
      return;
    }
    try {
      const serverCart = await cartService.getCart();
      const guest = loadGuestCart();
      if (guest.items.length > 0) {
        for (const item of guest.items) {
          try {
            await cartService.addItem({
              productId: String(item.productId),
              variantId: item.variantId,
              quantity: item.quantity,
              selectedOptions: item.selectedOptions,
            });
          } catch {
            // item may already exist server-side - ignore
          }
        }
        localStorage.removeItem(GUEST_CART_KEY);
        setCart(await cartService.getCart());
      } else {
        setCart(serverCart);
      }
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        setCart(loadGuestCart());
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (cart && !isAuthenticated) persistGuestCart(cart);
  }, [cart, isAuthenticated]);

  const recomputeTotals = useCallback((next: Cart): Cart => {
    const items = next.items.filter((item) => item.quantity > 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const { tax, shipping } = computeTotals(subtotal, next.discount, items.length);
    const discount = subtotal === 0 ? 0 : next.discount;
    return {
      ...next,
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      tax,
      shipping,
      discount,
      total: subtotal + tax + shipping - discount,
    };
  }, []);

  const addItem = useCallback(
    async (payload: AddToCartPayload) => {
      if (!isAuthenticated) {
        setCart((current) => {
          const base = current ?? loadGuestCart();
          const items = [...base.items];
          const existing = items.find((item) => cartItemKey(item) === cartItemKey(payload));
          if (existing) {
            existing.quantity += payload.quantity;
          } else {
            items.push({
              productId: payload.productId,
              variantId: payload.variantId,
              quantity: payload.quantity,
              price: 0,
              name: '',
              image: '',
              selectedOptions: payload.selectedOptions,
            });
          }
          return recomputeTotals({ ...base, items });
        });
        return;
      }
      setIsUpdating(true);
      try {
        const serverCart = await cartService.addItem(payload);
        setCart(recomputeTotals(serverCart));
      } catch (error) {
        throw new Error(getErrorMessage(error));
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, recomputeTotals],
  );

  const updateQuantity = useCallback(
    async (item: CartItem, quantity: number) => {
      if (quantity < 1) {
        await removeItem(item);
        return;
      }
      const key = cartItemKey(item);
      if (!isAuthenticated) {
        setCart((current) => {
          const base = current ?? loadGuestCart();
          return recomputeTotals({
            ...base,
            items: base.items.map((i) => (cartItemKey(i) === key ? { ...i, quantity } : i)),
          });
        });
        return;
      }
      setIsUpdating(true);
      setCart((current) => {
        if (!current) return current;
        return recomputeTotals({
          ...current,
          items: current.items.map((i) => (cartItemKey(i) === key ? { ...i, quantity } : i)),
        });
      });
      try {
        const serverCart = await cartService.updateItemQuantity(key, quantity);
        setCart(recomputeTotals(serverCart));
      } catch {
        try {
          const fresh = await cartService.getCart();
          setCart(recomputeTotals(fresh));
        } catch {
          // server cart sync unavailable - keep optimistic state
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, recomputeTotals],
  );

  const removeItem = useCallback(
    async (item: CartItem) => {
      const key = cartItemKey(item);
      if (!isAuthenticated) {
        setCart((current) => {
          const base = current ?? loadGuestCart();
          return recomputeTotals({ ...base, items: base.items.filter((i) => cartItemKey(i) !== key) });
        });
        return;
      }
      setIsUpdating(true);
      setCart((current) => {
        if (!current) return current;
        return recomputeTotals({ ...current, items: current.items.filter((i) => cartItemKey(i) !== key) });
      });
      try {
        await cartService.removeItem(key);
        const fresh = await cartService.getCart();
        setCart(recomputeTotals(fresh));
      } catch {
        try {
          const fresh = await cartService.getCart();
          setCart(recomputeTotals(fresh));
        } catch {
          // keep optimistic state
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, recomputeTotals],
  );

  const clear = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
      } catch {
        // fall through to local clear
      }
    }
    localStorage.removeItem(GUEST_CART_KEY);
    setCart(emptyCart());
  }, [isAuthenticated]);

  const applyCoupon = useCallback(
    async (code: string) => {
      if (!isAuthenticated) {
        setCart((current) => {
          const base = current ?? loadGuestCart();
          return { ...base, couponCode: code };
        });
        return;
      }
      setIsUpdating(true);
      try {
        const serverCart = await cartService.applyCoupon(code);
        setCart(recomputeTotals(serverCart));
      } catch (error) {
        throw new Error(getErrorMessage(error));
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, recomputeTotals],
  );

  const removeCoupon = useCallback(() => {
    setCart((current) => {
      if (!current) return current;
      return recomputeTotals({ ...current, couponCode: undefined, couponDiscount: 0, discount: 0 });
    });
  }, [recomputeTotals]);

  const count = cart?.totalItems ?? 0;
  const subtotal = cart?.subtotal ?? 0;

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      isUpdating,
      count,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      applyCoupon,
      removeCoupon,
      refresh,
    }),
    [cart, isLoading, isUpdating, count, subtotal, addItem, updateQuantity, removeItem, clear, applyCoupon, removeCoupon, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
