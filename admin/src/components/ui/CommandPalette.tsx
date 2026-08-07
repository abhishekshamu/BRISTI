import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  FolderTree,
  Layers,
  Warehouse,
  Ticket,
  Image,
  FileText,
  BookOpen,
  HelpCircle,
  Mail,
  PenTool,
  Palette,
  Type,
  Navigation,
  Globe,
  Bell,
  Shield,
  FileSearch,
  Settings,
  Plus,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const NAV = [
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
  { title: 'CMS Pages', path: '/pages', icon: FileText },
  { title: 'Blog', path: '/blogs', icon: BookOpen },
  { title: 'FAQ', path: '/faqs', icon: HelpCircle },
  { title: 'Messages', path: '/messages', icon: Mail },
  { title: 'Visual Builder', path: '/visual-builder', icon: PenTool },
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

const QUICK_CREATE = [
  { title: 'New product', path: '/products/create', icon: Plus },
  { title: 'New category', path: '/categories/create', icon: Plus },
  { title: 'New collection', path: '/collections/create', icon: Plus },
  { title: 'New blog post', path: '/blogs/create', icon: Plus },
  { title: 'New page', path: '/pages/create', icon: Plus },
  { title: 'New coupon', path: '/coupons/create', icon: Plus },
  { title: 'New FAQ', path: '/faqs/create', icon: Plus },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('admin:open-palette', openHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('admin:open-palette', openHandler);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  if (!open) return null;

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-[15vh] max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="max-h-[60vh] overflow-y-auto">
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4">
            <Command.Input
              placeholder="Type a command or search…"
              className="w-full h-12 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <span className="admin-kbd">ESC</span>
          </div>
          <Command.List className="p-2">
            <Command.Empty className="py-8 text-center text-sm text-slate-400">No results found.</Command.Empty>

            <Command.Group heading="Quick create" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              {QUICK_CREATE.map((item) => (
                <Command.Item
                  key={item.path}
                  onSelect={() => go(item.path)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">{item.title}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              {NAV.map((item) => (
                <Command.Item
                  key={item.path}
                  onSelect={() => go(item.path)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200">{item.title}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"
              >
                {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                <span className="text-slate-800 dark:text-slate-200">Toggle dark mode</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 dark:text-slate-200">Logout</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
