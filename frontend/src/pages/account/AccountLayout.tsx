import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Heart, User, MapPin, Lock, LogOut, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/account', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package, end: false },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart, end: false },
  { to: '/account/profile', label: 'Profile', icon: User, end: false },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false },
  { to: '/account/password', label: 'Security', icon: Lock, end: false },
];

export default function AccountLayout() {
  const { isAuthenticated, isLoading, user, profile, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center" aria-label="Loading account" role="status">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="container-lux pb-24 pt-32 lg:pt-36">
      <div className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-border">
              {profile?.avatar ? <AvatarImage src={profile.avatar} alt={user?.firstName ?? 'Profile'} /> : null}
              <AvatarFallback className="text-sm">{getInitials(`${user?.firstName ?? 'B'} ${user?.lastName ?? 'B'}`.trim())}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">My Account</p>
              <h1 className="font-display text-4xl font-medium">
                Welcome, {user?.firstName}
              </h1>
            </div>
          </div>
          {typeof profile?.rewardPoints === 'number' && profile.rewardPoints > 0 && (
            <span className="inline-flex w-fit items-center gap-2 border border-accent/30 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em]">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              {profile.rewardPoints.toLocaleString()} points
            </span>
          )}
        </div>
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
