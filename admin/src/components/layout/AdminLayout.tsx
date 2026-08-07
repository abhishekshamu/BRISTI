import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderTree,
  Layers,
  ShoppingCart,
  Warehouse,
  Ticket,
  Image,
  FileText,
  PenTool,
  Type,
  Palette,
  Navigation,
  Bell,
  Settings,
  Megaphone,
  Shield,
  FileSearch,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Globe,
  BookOpen,
  HelpCircle,
  Users,
  Mail,
  Sun,
  Moon,
  Search,
  Plus,
} from 'lucide-react';
import api from '../../lib/api';
import CommandPalette from '../ui/CommandPalette';
import ErrorBoundary from '../ui/ErrorBoundary';
import UserMenu from './UserMenu';

const menuSections = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', path: '/', icon: LayoutDashboard },
      { title: 'Analytics', path: '/analytics', icon: BarChart3 },
      { title: 'Notifications', path: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { title: 'Orders', path: '/orders', icon: ShoppingCart },
      { title: 'Customers', path: '/customers', icon: Users },
      { title: 'Products', path: '/products', icon: Package },
      { title: 'Categories', path: '/categories', icon: FolderTree },
      { title: 'Collections', path: '/collections', icon: Layers },
      { title: 'Inventory', path: '/inventory', icon: Warehouse },
      { title: 'Coupons', path: '/coupons', icon: Ticket },
    ],
  },
  {
    title: 'Content',
    items: [
      { title: 'Media', path: '/media', icon: Image },
      { title: 'CMS Pages', path: '/pages', icon: FileText },
      { title: 'Blog', path: '/blogs', icon: BookOpen },
      { title: 'FAQ', path: '/faqs', icon: HelpCircle },
      { title: 'Messages', path: '/messages', icon: Mail },
    ],
  },
  {
    title: 'Storefront',
    items: [
      { title: 'Visual Builder', path: '/visual-builder', icon: PenTool },
      { title: 'Theme Editor', path: '/theme/editor', icon: Palette },
      { title: 'Typography', path: '/theme/typography', icon: Type },
      { title: 'Navbar', path: '/theme/navbar', icon: Navigation },
      { title: 'Announcement Bar', path: '/theme/announcement', icon: Megaphone },
      { title: 'Footer', path: '/theme/footer', icon: Navigation },
      { title: 'SEO', path: '/theme/seo', icon: Globe },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Roles', path: '/roles', icon: Shield },
      { title: 'Audit Logs', path: '/audit', icon: FileSearch },
      { title: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

const allMenuItems = menuSections.flatMap((s) => s.items);

function titleFor(pathname: string): string {
  const exact = allMenuItems.find((i) => i.path === pathname);
  if (exact) return exact.title;
  if (/^\/products\/(create|\w+\/edit)/.test(pathname)) return 'Products';
  if (/^\/orders\/\w+/.test(pathname)) return 'Orders';
  if (/^\/categories\/(create|\w+\/edit)/.test(pathname)) return 'Categories';
  if (/^\/collections\/(create|\w+\/edit)/.test(pathname)) return 'Collections';
  if (/^\/pages\/(create|\w+\/edit)/.test(pathname)) return 'CMS Pages';
  if (/^\/blogs\/(create|\w+\/edit)/.test(pathname)) return 'Blog';
  if (/^\/faqs\/(create|\w+\/edit)/.test(pathname)) return 'FAQ';
  if (/^\/coupons\/(create|\w+\/edit)/.test(pathname)) return 'Coupons';
  if (/^\/visual-builder/.test(pathname)) return 'Visual Builder';
  if (/^\/account/.test(pathname)) return 'Account';
  return 'Dashboard';
}

export default function AdminLayout() {
  const { resolvedTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === '1');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  useEffect(() => {
    document.title = `${titleFor(location.pathname)} — BRISTI Admin`;
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    let cancelled = false;
    const loadCount = async () => {
      try {
        const res = await api.get('/notifications/count');
        if (!cancelled) setUnread(res.data?.data?.count ?? res.data?.count ?? 0);
      } catch {
        /* keep last value */
      }
    };
    void loadCount();
    const timer = setInterval(loadCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const closeMenus = () => { setQuickCreateOpen(false); };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const quickCreateItems = [
    { title: 'New product', to: '/products/create', icon: Package },
    { title: 'New blog post', to: '/blogs/create', icon: BookOpen },
    { title: 'Upload media', to: '/media', icon: Image },
    { title: 'New page', to: '/pages/create', icon: FileText },
    { title: 'New category', to: '/categories/create', icon: FolderTree },
    { title: 'New coupon', to: '/coupons/create', icon: Ticket },
  ];

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-card border-r border-slate-200 dark:border-slate-800
          transform transition-all duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'w-[76px]' : 'w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <Link to="/" className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center flex-1' : ''}`} onClick={() => setSidebarOpen(false)}>
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-sm shrink-0">
                <span className="text-gold font-serif font-bold text-base">B</span>
              </div>
              {!sidebarCollapsed && (
                <div className="leading-tight">
                  <span className="font-bold text-[15px] text-slate-900 dark:text-slate-50 tracking-[0.18em]">BRISTI</span>
                  <p className="text-[9.5px] uppercase tracking-[0.22em] text-slate-400 mt-0.5">Admin Panel</p>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className={`px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 ${sidebarCollapsed ? 'sr-only' : 'block'}`}>
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        title={sidebarCollapsed ? item.title : undefined}
                        className={({ isActive: active }) => `
                          relative flex items-center rounded-lg text-[13.5px] font-medium transition-colors
                          ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                          ${active
                            ? 'bg-slate-100/90 text-slate-900 dark:bg-slate-800/80 dark:text-slate-50'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold" />
                        )}
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${sidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-gold-dark dark:text-gold-light' : ''}`} />
                        {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden lg:flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              {!sidebarCollapsed && <span className="ml-2.5">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className={`${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'} h-full flex flex-col transition-[padding] duration-300`}>
        {/* Top header — actions only; page titles live in PageShell (no duplication) */}
        <header className="shrink-0 h-16 bg-card/80 dark:bg-card/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium">BRISTI</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 dark:text-slate-300">{titleFor(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => window.dispatchEvent(new Event('admin:open-palette'))}
              className="hidden md:flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Open command palette"
            >
              <Search className="w-4 h-4" />
              <span>Search…</span>
              <span className="admin-kbd ml-1">Ctrl K</span>
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-[18px] h-[18px] text-slate-500 dark:text-slate-300" /> : <Moon className="w-[18px] h-[18px] text-slate-500" />}
            </button>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-[18px] h-[18px] text-slate-500 dark:text-slate-300" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setQuickCreateOpen((v) => !v); }}
                className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Quick create"
                aria-haspopup="true"
                aria-expanded={quickCreateOpen}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              {quickCreateOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 admin-card p-1.5 shadow-xl z-40" onClick={(e) => e.stopPropagation()}>
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Quick create</p>
                  {quickCreateItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to + item.title}
                        to={item.to}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => setQuickCreateOpen(false)}
                      >
                        <Icon className="w-4 h-4 text-slate-400" /> {item.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="ml-1.5">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="admin-page px-4 sm:px-6 lg:px-10 py-7 lg:py-9">
            <ErrorBoundary>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
