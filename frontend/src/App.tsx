import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageLoader } from '@/components/shared/PageLoader';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('@/pages/CollectionDetailPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const NewArrivalsPage = lazy(() => import('@/pages/NewArrivalsPage'));
const SalePage = lazy(() => import('@/pages/SalePage'));
const BestSellersPage = lazy(() => import('@/pages/BestSellersPage'));
const TrendingPage = lazy(() => import('@/pages/TrendingPage'));
const FeaturedPage = lazy(() => import('@/pages/FeaturedPage'));
const RecommendedPage = lazy(() => import('@/pages/RecommendedPage'));
const LuxuryCollectionPage = lazy(() => import('@/pages/LuxuryCollectionPage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'));
const TrackOrderPage = lazy(() => import('@/pages/TrackOrderPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const JournalPage = lazy(() => import('@/pages/JournalPage'));
const BlogDetailPage = lazy(() => import('@/pages/BlogDetailPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PolicyPage = lazy(() => import('@/pages/PolicyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const AccountLayout = lazy(() => import('@/pages/account/AccountLayout'));
const DashboardPage = lazy(() => import('@/pages/account/DashboardPage'));
const OrdersPage = lazy(() => import('@/pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/account/OrderDetailPage'));
const ProfilePage = lazy(() => import('@/pages/account/ProfilePage'));
const AddressesPage = lazy(() => import('@/pages/account/AddressesPage'));
const SecurityPage = lazy(() => import('@/pages/account/SecurityPage'));

function withLoader(children: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      {withLoader(
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collection/:slug" element={<CollectionDetailPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/new-arrivals" element={<NewArrivalsPage />} />
            <Route path="/sale" element={<SalePage />} />
            <Route path="/best-sellers" element={<BestSellersPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/featured" element={<FeaturedPage />} />
            <Route path="/recommended" element={<RecommendedPage />} />
            <Route path="/luxury-collection" element={<LuxuryCollectionPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderNumber" element={<OrderConfirmationPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:slug" element={<BlogDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PolicyPage />} />
            <Route path="/terms" element={<PolicyPage />} />
            <Route path="/shipping" element={<PolicyPage />} />
            <Route path="/refund" element={<PolicyPage />} />
            <Route path="/faq" element={<PolicyPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="password" element={<SecurityPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>,
      )}
    </ErrorBoundary>
  );
}
