import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { catalogService } from '@/services/catalog.service';
import { useUIStore } from '@/store/useUIStore';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useSiteSettings } from '@/context/SettingsContext';
import { useScrolled } from '@/hooks/useScrollPosition';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { AnnouncementMarquee } from '@/components/shared/AnnouncementMarquee';
import { BrandIdentity } from '@/components/shared/BrandIdentity';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const { count } = useCart();
  const { productIds } = useWishlist();
  const { openSearch, openMobileNav, openCartDrawer } = useUIStore();
  const scrolled = useScrolled(40);
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = (settings?.navbar?.items ?? [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({ label: item.label, to: item.url }));

  const { data: categories } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogService.categoryTree,
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDesktop) setMenuOpen(false);
  }, [isDesktop]);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  const activeLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative pb-1 text-[11px] font-medium uppercase tracking-lux-sm transition-colors',
      isActive ? 'text-[var(--header-accent)]' : 'text-[var(--header-text)] hover:text-[var(--header-text-hover)]',
    );

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-500',
        scrolled ? 'border-b border-[var(--header-border)]/60 bg-[var(--header-background)]/95 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <AnnouncementMarquee />
      <div className="container-lux">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 lg:h-[var(--header-height)]">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6 lg:flex-none lg:gap-10">
            <button
              type="button"
              aria-label="Open menu"
              onClick={openMobileNav}
              className="flex h-10 w-10 shrink-0 items-center justify-center lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex min-w-0 flex-col leading-none">
              <BrandIdentity variant="header" showTagline />
            </Link>
          </div>

          {navLinks.length > 0 && (
            <nav className="hidden items-center gap-4 xl:gap-8 lg:flex" aria-label="Primary">
              {navLinks.slice(0, 2).map((link) => (
                <Link key={link.to} to={link.to} className="text-[11px] font-medium uppercase tracking-lux-sm text-[var(--header-text)] transition-colors hover:text-[var(--header-text-hover)]">
                  {link.label}
                </Link>
              ))}
              {navLinks.some((l) => l.to === '/shop') && (
                <div className="relative" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
                  <NavLink to="/shop" className={cn(activeLink, '')} end>
                    Shop all
                  </NavLink>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 top-full w-[640px] -translate-x-1/2 border border-[var(--header-border)] bg-[var(--header-dropdown-bg)] p-8 shadow-2xl"
                      >
                        <div className="grid grid-cols-3 gap-8">
                          <div>
                            <p className="mb-4 text-[10px] font-medium uppercase tracking-lux-sm text-muted-foreground">Categories</p>
                            <ul className="space-y-3">
                              {(categories ?? []).slice(0, 6).map((category) => (
                                <li key={String(category._id)}>
                                  <Link to={`/shop?category=${category.slug}`} className="text-sm text-[var(--header-dropdown-text)] transition-colors hover:text-[var(--header-text-hover)]">
                                    {category.name}
                                  </Link>
                                </li>
                              ))}
                              {(categories ?? []).length === 0 && (
                                <li className="text-sm text-muted-foreground">No categories yet</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            {navLinks.filter((l) => ['/collections', '/new-arrivals', '/sale'].includes(l.to)).length > 0 && (
                              <>
                                <p className="mb-4 text-[10px] font-medium uppercase tracking-lux-sm text-muted-foreground">Collections</p>
                                <ul className="space-y-3">
                                  {navLinks.filter((l) => ['/collections', '/new-arrivals', '/sale'].includes(l.to)).map((link) => (
                                    <li key={link.to}>
                                      <Link to={link.to} className="text-sm text-[var(--header-dropdown-text)] transition-colors hover:text-[var(--header-text-hover)]">{link.label}</Link>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {navLinks.filter((l) => ['/journal', '/about', '/contact'].includes(l.to)).length > 0 && (
                              <>
                                <p className="mb-4 mt-8 text-[10px] font-medium uppercase tracking-lux-sm text-muted-foreground">Explore</p>
                                <ul className="space-y-3">
                                  {navLinks.filter((l) => ['/journal', '/about', '/contact'].includes(l.to)).map((link) => (
                                    <li key={link.to}>
                                      <Link to={link.to} className="text-sm text-[var(--header-dropdown-text)] transition-colors hover:text-[var(--header-text-hover)]">{link.label}</Link>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {navLinks.slice(2).map((link) => (
                <Link key={link.to} to={link.to} className="text-[11px] font-medium uppercase tracking-lux-sm text-[var(--header-text)] transition-colors hover:text-[var(--header-text-hover)]">
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
            <button type="button" aria-label="Search" onClick={openSearch} className="flex h-10 w-10 items-center justify-center transition-colors hover:text-accent">
              <Search className="h-5 w-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Account" className="hidden h-10 w-10 items-center justify-center transition-colors hover:text-accent sm:flex">
                  {isAuthenticated && user ? (
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-accent text-xs text-accent-foreground">{getInitials(`${user.firstName} ${user.lastName}`)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuLabel className="flex flex-col">
                      <span className="text-sm">{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/account')}>Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account/orders')}>My Orders</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/account/addresses')}>Addresses</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/login')}>Sign in</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/register')}>Create account</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/wishlist" aria-label="Wishlist" className="relative flex h-10 w-10 items-center justify-center transition-colors hover:text-accent">
              <Heart className="h-5 w-5" />
              {productIds.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium text-accent-foreground">
                  {productIds.length}
                </span>
              )}
            </Link>

            <button type="button" aria-label="Shopping bag" onClick={openCartDrawer} className="relative flex h-10 w-10 items-center justify-center transition-colors hover:text-accent">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium text-accent-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
