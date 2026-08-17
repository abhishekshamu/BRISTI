import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { useSiteSettings } from '@/context/SettingsContext';
import { useUIStore } from '@/store/useUIStore';
import { BrandIdentity } from '@/components/shared/BrandIdentity';

export function MobileNav() {
  const { isMobileNavOpen, closeMobileNav } = useUIStore();
  const { settings } = useSiteSettings();
  const { data: categories } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  const navLinks = (settings?.navbar?.items ?? [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({ label: item.label, to: item.url }));

  return (
    <AnimatePresence>
      {isMobileNavOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-[var(--backdrop)] backdrop-blur-sm"
            onClick={closeMobileNav}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-y-0 left-0 z-[71] flex w-[85%] max-w-sm flex-col bg-[var(--mobile-drawer-bg)]"
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--mobile-nav-border)] px-6">
              <Link to="/" onClick={closeMobileNav}>
                <BrandIdentity variant="mobile" />
              </Link>
              <button type="button" aria-label="Close menu" onClick={closeMobileNav} className="flex h-10 w-10 items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-8">
              {navLinks.length > 0 && (
                <ul className="space-y-1">
                  {navLinks.map((link, index) => (
                    <motion.li
                      key={link.to}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <Link
                        to={link.to}
                        onClick={closeMobileNav}
                        className="flex items-center justify-between border-b border-[var(--mobile-nav-border)] py-4 font-display text-2xl font-medium tracking-wide text-[var(--mobile-drawer-text)]"
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              )}

              {(categories ?? []).length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-lux-sm text-muted-foreground">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {(categories ?? []).slice(0, 8).map((category) => (
                      <Link
                        key={String(category._id)}
                        to={`/shop?category=${category.slug}`}
                        onClick={closeMobileNav}
                        className="border border-[var(--mobile-nav-border)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            <div className="flex items-center justify-between border-t border-[var(--mobile-nav-border)] px-6 py-5">
              <Link to="/login" onClick={closeMobileNav} className="text-xs font-medium uppercase tracking-lux-sm hover:text-accent">
                Sign in
              </Link>
              <Link to="/track-order" onClick={closeMobileNav} className="text-xs font-medium uppercase tracking-lux-sm hover:text-accent">
                Track order
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
