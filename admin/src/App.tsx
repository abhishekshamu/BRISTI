import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Analytics from './pages/dashboard/Analytics';
import Products from './pages/products/Products';
import ProductCreate from './pages/products/ProductCreate';
import ProductEdit from './pages/products/ProductEdit';
import Categories from './pages/categories/Categories';
import Collections from './pages/collections/Collections';
import Orders from './pages/orders/Orders';
import OrderDetail from './pages/orders/OrderDetail';
import Customers from './pages/customers/Customers';
import Inventory from './pages/inventory/Inventory';
import Coupons from './pages/coupons/Coupons';
import MediaManager from './pages/media/MediaManager';
import Pages from './pages/cms/Pages';
import PageCreate from './pages/cms/PageCreate';
import PageEdit from './pages/cms/PageEdit';
import Blogs from './pages/cms/Blogs';
import BlogCreate from './pages/cms/BlogCreate';
import BlogEdit from './pages/cms/BlogEdit';
import Faqs from './pages/cms/Faqs';
import FaqCreate from './pages/cms/FaqCreate';
import FaqEdit from './pages/cms/FaqEdit';
import CategoryCreate from './pages/categories/CategoryCreate';
import CategoryEdit from './pages/categories/CategoryEdit';
import CollectionCreate from './pages/collections/CollectionCreate';
import CollectionEdit from './pages/collections/CollectionEdit';
import CouponCreate from './pages/coupons/CouponCreate';
import CouponEdit from './pages/coupons/CouponEdit';
import HomepageBuilder from './pages/theme/HomepageBuilder';
import PageBuilder from './pages/theme/PageBuilder';
import ThemeEditor from './pages/theme/ThemeEditor';
import TypographyEditor from './pages/theme/TypographyEditor';
import NavbarEditor from './pages/theme/NavbarEditor';
import FooterEditor from './pages/theme/FooterEditor';
import SeoManagement from './pages/theme/SeoManagement';
import Notifications from './pages/dashboard/Notifications';
import Settings from './pages/settings/Settings';
import Roles from './pages/roles/Roles';
import AuditLogs from './pages/audit/AuditLogs';
import NotFound from './pages/auth/NotFound';
import HeroManager from './pages/hero/HeroManager';
import HeroEdit from './pages/hero/HeroEdit';
import Messages from './pages/messages/Messages';

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
        <Route path="theme/homepage-builder" element={<HomepageBuilder />} />
        <Route path="hero" element={<HeroManager />} />
        <Route path="hero/create" element={<HeroEdit />} />
        <Route path="hero/:id/edit" element={<HeroEdit />} />
        <Route path="theme/page-builder" element={<PageBuilder />} />
        <Route path="theme/editor" element={<ThemeEditor />} />
        <Route path="theme/typography" element={<TypographyEditor />} />
        <Route path="theme/navbar" element={<NavbarEditor />} />
        <Route path="theme/footer" element={<FooterEditor />} />
        <Route path="theme/seo" element={<SeoManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;