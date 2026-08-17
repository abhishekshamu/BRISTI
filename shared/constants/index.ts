// Shared Constants

// Slugs reserved by the legacy marketing-collection system. Marketing and
// homepage sections are driven by independent product boolean flags (isNewArrival,
// isBestSeller, ...), never by collections. These slugs must never appear in
// the Collection model or on a product's `collections` array.
export const MARKETING_COLLECTION_SLUGS = [
  'new-arrival',
  'best-seller',
  'trending',
  'sale',
  'featured',
  'recommended',
  'exclusive',
  'limited-edition',
  'editor-choice',
  'luxury-collection',
  'customer-favorites',
];

export const ROUTES = {
  // Public routes
  HOME: '/',
  SHOP: '/shop',
  PRODUCT_DETAILS: (slug: string) => `/product/${slug}`,
  COLLECTIONS: '/collections',
  COLLECTION_DETAILS: (slug: string) => `/collection/${slug}`,
  NEW_ARRIVALS: '/new-arrivals',
  SALE: '/sale',
  ABOUT: '/about',
  JOURNAL: '/journal',
  JOURNAL_DETAIL: (slug: string) => `/journal/${slug}`,
  CONTACT: '/contact',
  WISHLIST: '/wishlist',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_CONFIRMATION: (orderNumber: string) => `/order/${orderNumber}`,
  TRACK_ORDER: '/track-order',
  USER_DASHBOARD: '/account',
  USER_ORDERS: '/account/orders',
  USER_ORDER_DETAILS: (orderNumber: string) => `/account/orders/${orderNumber}`,
  USER_WISHLIST: '/account/wishlist',
  USER_PROFILE: '/account/profile',
  USER_ADDRESSES: '/account/addresses',
  USER_WISHES: '/account/wishes',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: (token: string) => `/reset-password/${token}`,
  PRIVACY: '/privacy',
  TERMS: '/terms',
  SHIPPING: '/shipping',
  REFUND: '/refund',
  FAQ: '/faq',
  SEARCH: '/search',
  NOT_FOUND: '*',

  // Admin routes
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_DETAILS: (orderId: string) => `/admin/orders/${orderId}`,
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_PRODUCT_DETAILS: (productId: string) => `/admin/products/${productId}`,
  ADMIN_ADD_PRODUCT: '/admin/products/add',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_COLLECTIONS: '/admin/collections',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_USERS: '/admin/users',
  ADMIN_BLOGS: '/admin/blogs',
  ADMIN_PAGES: '/admin/pages',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_THEME: '/admin/theme',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_ANALYTICS: '/admin/analytics',
};

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',
  AUTH_VERIFY_EMAIL: '/api/auth/verify-email',
  AUTH_GOOGLE: '/api/auth/google',
  AUTH_GOOGLE_CALLBACK: '/api/auth/google/callback',

  // Users
  USERS_ME: '/api/users/me',
  USERS_UPDATE_PROFILE: '/api/users/profile',
  USERS_UPDATE_PASSWORD: '/api/users/password',
  USERS_ADDRESSES: '/api/users/addresses',
  USERS_ADDRESS: (id: string) => `/api/users/addresses/${id}`,

  // Products
  PRODUCTS: '/api/products',
  PRODUCT: (id: string) => `/api/products/${id}`,
  PRODUCTS_FEATURED: '/api/products/featured',
  PRODUCTS_NEW_ARRIVALS: '/api/products/new-arrivals',
  PRODUCTS_SALE: '/api/products/sale',
  PRODUCTS_SEARCH: '/api/products/search',
  PRODUCTS_RELATED: (productId: string) => `/api/products/${productId}/related`,
  PRODUCTS_REVIEWS: (productId: string) => `/api/products/${productId}/reviews`,
  PRODUCT_REVIEW: (productId: string, reviewId: string) => `/api/products/${productId}/reviews/${reviewId}`,

  // Categories
  CATEGORIES: '/api/categories',
  CATEGORY: (id: string) => `/api/categories/${id}`,

  // Collections
  COLLECTIONS: '/api/collections',
  COLLECTION: (id: string) => `/api/collections/${id}`,

  // Cart
  CART: '/api/cart',
  CART_ADD_ITEM: '/api/cart/add-item',
  CART_UPDATE_ITEM: (itemId: string) => `/api/cart/update-item/${itemId}`,
  CART_REMOVE_ITEM: (itemId: string) => `/api/cart/remove-item/${itemId}`,
  CART_CLEAR: '/api/cart/clear',

  // Wishlist
  WISHLIST: '/api/wishlist',
  WISHLIST_ADD: '/api/wishlist/add',
  WISHLIST_REMOVE: (productId: string) => `/api/wishlist/remove/${productId}`,

  // Orders
  ORDERS: '/api/orders',
  ORDER: (id: string) => `/api/orders/${id}`,
  ORDERS_CREATE: '/api/orders',
  ORDER_PAYMENT: (orderId: string) => `/api/orders/${orderId}/payment`,
  ORDER_CANCEL: (orderId: string) => `/api/orders/${orderId}/cancel`,
  TRACK_ORDER: '/api/track-order',

  // Coupons
  COUPONS: '/api/coupons',
  COUPON_VALIDATE: '/api/coupons/validate',

  // Payments
  PAYMENT_STRIPE_INTENT: '/api/payment/stripe/create-intent',
  PAYMENT_RAZORPAY_ORDER: '/api/payment/razorpay/create-order',

  // Reviews
  REVIEWS: '/api/reviews',
  REVIEW: (id: string) => `/api/reviews/${id}`,

  // Newsletter
  NEWSLETTER_SUBSCRIBE: '/api/newsletter/subscribe',
  NEWSLETTER_UNSUBSCRIBE: '/api/newsletter/unsubscribe',

  // Blog
  BLOGS: '/api/blogs',
  BLOG: (id: string) => `/api/blogs/${id}`,

  // Pages
  PAGES: '/api/pages',
  PAGE: (id: string) => `/api/pages/${id}`,
  PAGE_BY_SLUG: (slug: string) => `/api/pages/slug/${slug}`,

  // Contact
  CONTACT: '/api/contact',

  // Admin APIs
  ADMIN_DASHBOARD_STATS: '/api/admin/dashboard/stats',
  ADMIN_ORDERS: '/api/admin/orders',
  ADMIN_ORDER: (id: string) => `/api/admin/orders/${id}`,
  ADMIN_ORDER_STATUS: (id: string) => `/api/admin/orders/${id}/status`,
  ADMIN_PRODUCTS: '/api/admin/products',
  ADMIN_PRODUCT: (id: string) => `/api/admin/products/${id}`,
  ADMIN_CATEGORIES: '/api/admin/categories',
  ADMIN_COLLECTIONS: '/api/admin/collections',
  ADMIN_COUPONS: '/api/admin/coupons',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USER: (id: string) => `/api/admin/users/${id}`,
  ADMIN_BLOGS: '/api/admin/blogs',
  ADMIN_BLOG: (id: string) => `/api/admin/blogs/${id}`,
  ADMIN_PAGES: '/api/admin/pages',
  ADMIN_PAGE: (id: string) => `/api/admin/pages/${id}`,
  ADMIN_SETTINGS: '/api/admin/settings',
  ADMIN_SETTINGS_UPDATE: '/api/admin/settings',
  ADMIN_THEME: '/api/admin/theme',
  ADMIN_THEME_UPDATE: '/api/admin/theme',
  ADMIN_MEDIA: '/api/admin/media',
  ADMIN_MEDIA_UPLOAD: '/api/admin/media/upload',
  ADMIN_MEDIA_DELETE: (id: string) => `/api/admin/media/${id}`,
  ADMIN_SETTINGS_SEO: '/api/admin/settings/seo',
  ADMIN_SETTINGS_PAYMENT: '/api/admin/settings/payment',
  ADMIN_SETTINGS_SHIPPING: '/api/admin/settings/shipping',
  ADMIN_SETTINGS_TAX: '/api/admin/settings/tax',
  ADMIN_NOTIFICATIONS: '/api/admin/notifications',
  ADMIN_ANALYTICS: '/api/admin/analytics',
};

// ============================================================
// MEDIA SYSTEM
// ============================================================

export interface MediaRatio {
  w: number;
  h: number;
  label: string;
}

/**
 * Exact display ratios used by the storefront. These are read directly from
 * the frontend components (never invented) so the admin ImagePicker can offer
 * pixel-true presets for every surface.
 */
export const MEDIA_RATIOS: Record<string, MediaRatio> = {
  hero: { w: 601, h: 751, label: 'Hero slide' },
  product: { w: 3, h: 4, label: 'Product card' },
  collection: { w: 4, h: 5, label: 'Collection card' },
  category: { w: 4, h: 5, label: 'Category card' },
  collectionBannerDesktop: { w: 21, h: 9, label: 'Collection banner (desktop)' },
  collectionBannerTablet: { w: 16, h: 7, label: 'Collection banner (tablet)' },
  collectionBannerMobile: { w: 4, h: 3, label: 'Collection banner (mobile)' },
  categoryBanner: { w: 21, h: 9, label: 'Category banner' },
  blogFeatured: { w: 21, h: 10, label: 'Blog featured' },
  blogCard: { w: 4, h: 3, label: 'Blog card' },
  journalFeatured: { w: 16, h: 10, label: 'Journal featured' },
  journalCard: { w: 4, h: 3, label: 'Journal card' },
  campaign: { w: 21, h: 9, label: 'Campaign banner' },
  campaignMobile: { w: 16, h: 9, label: 'Campaign banner (mobile)' },
  promotionDesktop: { w: 60, h: 7, label: 'Promotion banner (desktop)' },
  promotionTablet: { w: 7, h: 1, label: 'Promotion banner (tablet)' },
  promotionMobile: { w: 21, h: 5, label: 'Promotion banner (mobile)' },
  editorial: { w: 21, h: 9, label: 'Editorial banner' },
  instagram: { w: 1, h: 1, label: 'Instagram tile' },
  favicon: { w: 1, h: 1, label: 'Favicon' },
  seo: { w: 1200, h: 630, label: 'Social / OG image' },
  square: { w: 1, h: 1, label: 'Square' },
  landscape: { w: 16, h: 9, label: 'Landscape' },
  portrait: { w: 4, h: 5, label: 'Portrait' },
  blogBody: { w: 0, h: 0, label: 'Free (blog body)' },
  logo: { w: 0, h: 0, label: 'Free (logo)' },
};

export const MEDIA_RATIO_KEYS = Object.keys(MEDIA_RATIOS);

export function getMediaRatio(key: string): MediaRatio | null {
  return MEDIA_RATIOS[key] ?? null;
}

export function ratioToCss(key: string): string | null {
  const r = MEDIA_RATIOS[key];
  if (!r || r.w === 0 || r.h === 0) return null;
  return `${r.w} / ${r.h}`;
}

export interface CropPreset {
  id: string;
  label: string;
  ratio: { w: number; h: number } | null;
}

export const CROP_PRESETS: CropPreset[] = [
  { id: 'hero', label: 'Hero', ratio: { w: 601, h: 751 } },
  { id: 'product', label: 'Product', ratio: { w: 3, h: 4 } },
  { id: 'collection', label: 'Collection', ratio: { w: 4, h: 5 } },
  { id: 'category', label: 'Category', ratio: { w: 4, h: 5 } },
  { id: 'square', label: 'Square', ratio: { w: 1, h: 1 } },
  { id: 'landscape', label: 'Landscape', ratio: { w: 16, h: 9 } },
  { id: 'portrait', label: 'Portrait', ratio: { w: 4, h: 5 } },
  { id: 'custom', label: 'Custom', ratio: null },
];

/** Default folders surfaced in the Media Library sidebar. */
export const MEDIA_FOLDERS = [
  'general',
  'products',
  'categories',
  'collections',
  'blogs',
  'journal',
  'hero',
  'promotion',
  'home',
  'settings',
  'pages',
  'testimonials',
  'faq',
  'brand',
];

export const MEDIA_SCOPES = [
  { id: 'products', label: 'Products' },
  { id: 'collections', label: 'Collections' },
  { id: 'categories', label: 'Categories' },
  { id: 'hero', label: 'Hero' },
  { id: 'promotion', label: 'Promotion banners' },
  { id: 'blogs', label: 'Blog' },
  { id: 'pages', label: 'CMS Pages' },
  { id: 'settings', label: 'Site settings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'layouts', label: 'Layouts' },
] as const;

export type MediaSortKey = 'newest' | 'oldest' | 'name' | 'size' | 'used';

export const MEDIA_ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif'];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // All permissions
  ADMIN: [
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'collections:read', 'collections:create', 'collections:update', 'collections:delete',
    'orders:read', 'orders:update',
    'users:read', 'users:update',
    'coupons:read', 'coupons:create', 'coupons:update', 'coupons:delete',
    'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
    'pages:read', 'pages:create', 'pages:update', 'pages:delete',
    'settings:read', 'settings:update',
    'media:read', 'media:create', 'media:delete',
    'analytics:read',
  ],
  MODERATOR: [
    'products:read',
    'categories:read',
    'collections:read',
    'orders:read',
    'users:read',
    'reviews:read', 'reviews:update',
    'blogs:read',
    'pages:read',
    'media:read',
  ],
  CONTENT_EDITOR: [
    'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
    'pages:read', 'pages:create', 'pages:update', 'pages:delete',
    'media:read', 'media:create', 'media:delete',
  ],
  SUPPORT: [
    'orders:read', 'orders:update',
    'users:read', 'users:update',
    'reviews:read',
  ],
};

export const PAYMENT_METHODS = [
  { id: 'credit_card', label: 'Credit Card', icon: 'credit-card' },
  { id: 'debit_card', label: 'Debit Card', icon: 'credit-card' },
  { id: 'paypal', label: 'PayPal', icon: 'paypal' },
  { id: 'apple_pay', label: 'Apple Pay', icon: 'apple' },
  { id: 'google_pay', label: 'Google Pay', icon: 'google' },
  { id: 'razorpay', label: 'Razorpay', icon: 'credit-card' },
  { id: 'stripe', label: 'Stripe', icon: 'credit-card' },
  { id: 'cod', label: 'Cash on Delivery', icon: 'currency-dollar' },
];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refunded', label: 'Refunded' },
];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially Refunded' },
];

export const COUPON_TYPES = [
  { value: 'percentage', label: 'Percentage Discount' },
  { value: 'fixed_amount', label: 'Fixed Amount Discount' },
  { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'bogo', label: 'Buy One Get One' },
];

export const REVIEW_STATUSES = [
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const BLOG_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export const PAGE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export const PRODUCT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const USER_ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Administrator' },
  { value: 'moderator', label: 'Moderator' },
];

export const ADMIN_ROLES = [
  { value: 'super_admin', label: 'Super Administrator' },
  { value: 'admin', label: 'Administrator' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'content_editor', label: 'Content Editor' },
  { value: 'support', label: 'Support Agent' },
];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

/**
 * BCP-47 locales used when formatting each currency with Intl.NumberFormat.
 * Kept next to CURRENCIES so admin and storefront agree on the exact output
 * (₹5,000 Indian grouping, $60.00 US decimals, …).
 */
export const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
};

/**
 * The currency product prices are stored in. Product/order/cart amounts in the
 * database are base-currency amounts; the storefront converts them to the
 * configured display currency at render time. Never convert an already
 * converted display value again.
 */
export const DEFAULT_BASE_CURRENCY = 'INR';

/**
 * Fallback exchange rates: how many units of the target currency equal ONE
 * unit of the base currency (base = DEFAULT_BASE_CURRENCY). These are
 * configurable overrides stored in settings.exchangeRates — the storefront
 * prefers settings rates and falls back to this table (rate 1 when a currency
 * has no entry, e.g. the base currency itself). Swap the table for a live
 * provider later without touching any component.
 */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  JPY: 1.78,
  CAD: 0.016,
  AUD: 0.018,
  SGD: 0.016,
};

export const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'twitter', label: 'Twitter', icon: 'twitter' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
];

export const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

export const DEFAULT_SETTINGS = {
  brandName: 'BRISTI',
  logo: '/logo.png',
  favicon: '/favicon.svg',
  slogan: '',
  colors: {
    primary: '#000000',
    secondary: '#FFFFFF',
    background: '#FFFFFF',
    text: '#000000',
    accent: '#C9A227',
  },
  typography: {
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Inter',
    baseSize: '16px',
  },
  layout: {
    headerStyle: 'classic',
    footerStyle: 'classic',
  },
  contactInfo: {
    email: '',
    phone: '',
    address: '',
  },
  socialLinks: [],
  policies: {
    privacy: '/privacy',
    terms: '/terms',
    refund: '/refund',
    shipping: '/shipping',
  },
  seo: {
    defaultTitle: 'BRISTI',
    defaultDescription: '',
    defaultImage: '',
  },
  currency: 'USD',
  taxRate: 0.1, // 10%
  freeShippingThreshold: 100, // $100
};

export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  fadeUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  fadeDown: {
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  fadeLeft: {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  fadeRight: {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  hoverScale: {
    whileTap: { scale: 0.95 },
  },
  hoverLift: {
    whileTap: { y: -5 },
  },
  float: {
    initial: { y: 0 },
    animate: { y: [-10, 0, -10, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  },
  pulse: {
    initial: { opacity: 1 },
    animate: { opacity: [1, 0.8, 1], transition: { duration: 2, repeat: Infinity } },
  },
  shimmer: {
    initial: { backgroundPosition: '-200px 0' },
    animate: { backgroundPosition: ['-200px 0', '200px 0', '-200px 0'], transition: { duration: 3, repeat: Infinity } },
  },
};

export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

export const LIMITS = {
  PRODUCTS_PER_PAGE: 20,
  BLOGS_PER_PAGE: 10,
  COMMENTS_PER_PAGE: 10,
  REVIEWS_PER_PAGE: 10,
  ORDERS_PER_PAGE: 20,
  USERS_PER_PAGE: 20,
  CATEGORIES_PER_PAGE: 20,
  COLLECTIONS_PER_PAGE: 20,
  COUPONS_PER_PAGE: 20,
  PAGES_PER_PAGE: 20,
};

export const IMAGE_SIZES = {
  THUMBNAIL: { width: 300, height: 300 },
  SMALL: { width: 500, height: 500 },
  MEDIUM: { width: 800, height: 800 },
  LARGE: { width: 1200, height: 1200 },
  HERO: { width: 1920, height: 1080 },
  BANNER: { width: 1600, height: 600 },
};

export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  MODEL: ['model/gltf+json', 'model/gltf-bin', 'model/obj', 'application/octet-stream'],
  DOCUMENT: ['application/pdf', 'text/plain'],
};

export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  MODEL: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
};