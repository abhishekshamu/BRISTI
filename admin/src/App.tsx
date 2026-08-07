import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import AdminLayout from './components/layout/AdminLayout';
import PageSpinner from './components/ui/PageSpinner';

const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const Products = lazy(() => import('./pages/products/Products'));
const ProductCreate = lazy(() => import('./pages/products/ProductCreate'));
const ProductEdit = lazy(() => import('./pages/products/ProductEdit'));
const Categories = lazy(() => import('./pages/categories/Categories'));
const Collections = lazy(() => import('./pages/collections/Collections'));
const Orders = lazy(() => import('./pages/orders/Orders'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const Customers = lazy(() => import('./pages/customers/Customers'));
const Inventory = lazy(() => import('./pages/inventory/Inventory'));
const Coupons = lazy(() => import('./pages/coupons/Coupons'));
const MediaManager = lazy(() => import('./pages/media/MediaManager'));
const Pages = lazy(() => import('./pages/cms/Pages'));
const PageCreate = lazy(() => import('./pages/cms/PageCreate'));
const PageEdit = lazy(() => import('./pages/cms/PageEdit'));
const Blogs = lazy(() => import('./pages/cms/Blogs'));
const BlogCreate = lazy(() => import('./pages/cms/BlogCreate'));
const BlogEdit = lazy(() => import('./pages/cms/BlogEdit'));
const Faqs = lazy(() => import('./pages/cms/Faqs'));
const FaqCreate = lazy(() => import('./pages/cms/FaqCreate'));
const FaqEdit = lazy(() => import('./pages/cms/FaqEdit'));
const CategoryCreate = lazy(() => import('./pages/categories/CategoryCreate'));
const CategoryEdit = lazy(() => import('./pages/categories/CategoryEdit'));
const CollectionCreate = lazy(() => import('./pages/collections/CollectionCreate'));
const CollectionEdit = lazy(() => import('./pages/collections/CollectionEdit'));
const CouponCreate = lazy(() => import('./pages/coupons/CouponCreate'));
const CouponEdit = lazy(() => import('./pages/coupons/CouponEdit'));
const VisualBuilder = lazy(() => import('./pages/theme/VisualBuilder'));
const ThemeEditor = lazy(() => import('./pages/theme/ThemeEditor'));
const TypographyEditor = lazy(() => import('./pages/theme/TypographyEditor'));
const NavbarEditor = lazy(() => import('./pages/theme/NavbarEditor'));
const FooterEditor = lazy(() => import('./pages/theme/FooterEditor'));
const AnnouncementBarEditor = lazy(() => import('./pages/theme/AnnouncementBarEditor'));
const SeoManagement = lazy(() => import('./pages/theme/SeoManagement'));
const Notifications = lazy(() => import('./pages/dashboard/Notifications'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Roles = lazy(() => import('./pages/roles/Roles'));
const AuditLogs = lazy(() => import('./pages/audit/AuditLogs'));
const NotFound = lazy(() => import('./pages/auth/NotFound'));
const Account = lazy(() => import('./pages/account/Account'));
const Messages = lazy(() => import('./pages/messages/Messages'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<PageSpinner label="Loading…" />}>
      <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="products" element={<Products />} />
        <Route path="products/create" element={<ProductCreate />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/:id/edit" element={<CategoryEdit />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/create" element={<CollectionCreate />} />
        <Route path="collections/:id/edit" element={<CollectionEdit />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="coupons/create" element={<CouponCreate />} />
        <Route path="coupons/:id/edit" element={<CouponEdit />} />
        <Route path="media" element={<MediaManager />} />
        <Route path="pages" element={<Pages />} />
        <Route path="pages/create" element={<PageCreate />} />
        <Route path="pages/:id/edit" element={<PageEdit />} />
        <Route path="blogs" element={<Blogs />} />
        <Route path="blogs/create" element={<BlogCreate />} />
        <Route path="blogs/:id/edit" element={<BlogEdit />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="faqs/create" element={<FaqCreate />} />
        <Route path="faqs/:id/edit" element={<FaqEdit />} />
        <Route path="messages" element={<Messages />} />
        <Route path="visual-builder" element={<VisualBuilder />} />
        <Route path="theme/homepage-builder" element={<Navigate to="/visual-builder?page=homepage" replace />} />
        <Route path="theme/page-builder" element={<Navigate to="/visual-builder?page=homepage" replace />} />
        <Route path="hero" element={<Navigate to="/visual-builder?page=homepage" replace />} />
        <Route path="hero/:id/edit" element={<Navigate to="/visual-builder?page=homepage" replace />} />
        <Route path="promotion-banners" element={<Navigate to="/visual-builder?page=homepage" replace />} />
        <Route path="theme/editor" element={<ThemeEditor />} />
        <Route path="theme/typography" element={<TypographyEditor />} />
        <Route path="theme/navbar" element={<NavbarEditor />} />
        <Route path="theme/footer" element={<FooterEditor />} />
        <Route path="theme/announcement" element={<AnnouncementBarEditor />} />
        <Route path="theme/seo" element={<SeoManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="account" element={<Account />} />
        <Route path="settings" element={<Settings />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;