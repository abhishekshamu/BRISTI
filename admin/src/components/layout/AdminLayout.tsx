import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import {
  LayoutDashboard,
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
  BarChart3,
  Bell,
  Settings,
  Shield,
  FileSearch,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Globe,
  BookOpen,
  HelpCircle,
  Users,
} from 'lucide-react';
import { useState } from 'react';

const adminMenuItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Analytics', path: '/analytics', icon: BarChart3 },
  { title: 'Orders', path: '/orders', icon: ShoppingCart },
  { title: 'Customers', path: '/customers', icon: Users },
  { title: 'Products', path: '/products', icon: Package },
  { title: 'Categories', path: '/categories', icon: FolderTree },
  { title: 'Collections', path: '/collections', icon: Layers },
  { title: 'Inventory', path: '/inventory', icon: Warehouse },
  { title: 'Coupons', path: '/coupons', icon: Ticket },
  { title: 'Media', path: '/media', icon: Image },
  { title: 'CMS', path: '/pages', icon: FileText },
  { title: 'Blog', path: '/blogs', icon: BookOpen },
  { title: 'FAQ', path: '/faqs', icon: HelpCircle },
  { title: 'Homepage Builder', path: '/theme/homepage-builder', icon: Home },
  { title: 'Page Builder', path: '/theme/page-builder', icon: PenTool },
  { title: 'Theme Editor', path: '/theme/editor', icon: Palette },
  { title: 'Typography', path: '/theme/typography', icon: Type },
  { title: 'Navbar', path: '/theme/navbar', icon: Navigation },
  { title: 'Footer', path: '/theme/footer', icon: Navigation },
  { title: 'SEO', path: '/theme/seo', icon: Globe },
  { title: 'Notifications', path: '/notifications', icon: Bell },
  { title: 'Roles', path: '/roles', icon: Shield },
  { title: 'Audit Logs', path: '/audit', icon: FileSearch },
  { title: 'Settings', path: '/settings', icon: Settings },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const item = adminMenuItems.find(item => item.path === currentPath);
    if (item) return item.title;
    if (currentPath.startsWith('/products/')) return 'Products';
    if (currentPath.startsWith('/orders/')) return 'Orders';
    if (currentPath.startsWith('/pages/')) return 'Pages';
    if (currentPath.startsWith('/blogs/')) return 'Blogs';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 dark:bg-slate-50 rounded-lg flex items-center justify-center">
                <span className="text-white dark:text-slate-900 font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-slate-50">BRISTI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {item.title}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {admin?.firstName?.[0]}{admin?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                  {admin?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="ml-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {getPageTitle()}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 relative">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}