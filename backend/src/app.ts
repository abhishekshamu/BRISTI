import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/error.middleware';
import { csrfProtection } from './middleware/csrf.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import collectionRoutes from './routes/collection.routes';
import orderRoutes from './routes/order.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import couponRoutes from './routes/coupon.routes';
import reviewRoutes from './routes/review.routes';
import blogRoutes from './routes/blog.routes';
import pageRoutes from './routes/page.routes';
import settingsRoutes from './routes/settings.routes';
import themeRoutes from './routes/theme.routes';
import heroRoutes from './routes/hero.routes';
import newsletterRoutes from './routes/newsletter.routes';
import notificationRoutes from './routes/notification.routes';
import paymentRoutes from './routes/payment.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import mediaRoutes from './routes/media.routes';
import inventoryRoutes from './routes/inventory.routes';
import faqRoutes from './routes/faq.routes';
import auditRoutes from './routes/audit.routes';
import roleRoutes from './routes/role.routes';
import searchRoutes from './routes/search.routes';
import seoRoutes from './routes/seo.routes';
import contactRoutes from './routes/contact.routes';
import promotionBannerRoutes from './routes/promotion-banner.routes';

dotenv.config();

const app: Express = express();

// Trust the first hop only when explicitly enabled (behind a reverse proxy).
// Keeps rate limiting and req.ip correct in proxied deployments.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Support a comma-separated allow-list of origins (e.g. storefront + admin on different ports)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true
}));
app.use(helmet({
  // The storefront and admin run on different origins/ports and embed
  // images served from this API (/uploads). Helmet's default
  // Cross-Origin-Resource-Policy: same-origin blocks every cross-origin
  // no-cors image load (blank product images / broken thumbnails).
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Endpoints excluded from rate limiting while developing, so localhost coding is never blocked
const DEV_RATE_LIMIT_SKIP_PREFIXES = ['/health', '/api/admin/dashboard', '/api/theme'];

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  // Production: strict (default 300 requests / 15 min). Development: greatly relaxed.
  limit: IS_PRODUCTION
    ? Number(process.env.API_RATE_LIMIT || 300)
    : Number(process.env.API_RATE_LIMIT_DEV || 10000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => {
    if (IS_PRODUCTION) return false;
    return DEV_RATE_LIMIT_SKIP_PREFIXES.some(
      (prefix) => req.path === prefix || req.path.startsWith(prefix),
    );
  },
}));

// Auth-specific limiter (login/register/password flows). Configurable via AUTH_RATE_LIMIT.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: IS_PRODUCTION
    ? Number(process.env.AUTH_RATE_LIMIT || 20)
    : Number(process.env.AUTH_RATE_LIMIT_DEV || 10000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  skip: (req) => {
    if (IS_PRODUCTION) return false;
    return DEV_RATE_LIMIT_SKIP_PREFIXES.some(
      (prefix) => req.path === prefix || req.path.startsWith(prefix),
    );
  },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/otp/request', authLimiter);
app.use('/api/auth/otp/verify', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(cookieParser());

// CSRF defense-in-depth: validates X-XSRF-TOKEN on state-changing authed requests.
app.use('/api', csrfProtection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/promotion-banners', promotionBannerRoutes);
app.use(seoRoutes);

// Local uploads (fallback when Cloudinary is not configured)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'BRISTI API'
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
