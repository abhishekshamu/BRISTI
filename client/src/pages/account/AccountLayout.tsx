import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Heart, User, MapPin, Lock, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/account', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package, end: false },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart, end: false },
  { to: '/account/profile', label: 'Profile', icon: User, end: false },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false },
  { to: '/account/password', label: 'Security', icon: Lock, end: false },
];

export default function AccountLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center" aria-label="Loading account" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="container-lux pb-24 pt-32 lg:pt-36">
      <div className="mb-10 flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">My Account</p>
        <h1 className="font-display text-4xl font-medium">
          Welcome, {user?.firstName}
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col">
          <nav className="flex flex-col border border-border" aria-label="Account">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 border-b border-border px-5 py-4 text-xs font-medium uppercase tracking-[0.12em] transition-colors last:border-b-0',
                    isActive ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-3 border-t border-border px-5 py-4 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
