import { create } from 'zustand';

interface UIState {
  isSearchOpen: boolean;
  isMobileNavOpen: boolean;
  isCartDrawerOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSearchOpen: false,
  isMobileNavOpen: false,
  isCartDrawerOpen: false,
  openSearch: () => set({ isSearchOpen: true, isMobileNavOpen: false, isCartDrawerOpen: false }),
  closeSearch: () => set({ isSearchOpen: false }),
  openMobileNav: () => set({ isMobileNavOpen: true, isSearchOpen: false, isCartDrawerOpen: false }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  openCartDrawer: () => set({ isCartDrawerOpen: true, isSearchOpen: false, isMobileNavOpen: false }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  closeAll: () => set({ isSearchOpen: false, isMobileNavOpen: false, isCartDrawerOpen: false }),
}));
