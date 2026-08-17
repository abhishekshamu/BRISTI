// Shared Types

export type BrandWordmarkMode = 'text' | 'image';

/**
 * Brand Name / Wordmark. Exactly one display mode drives the storefront:
 * - text  → the configured text brand name is rendered
 * - image → the uploaded wordmark image is rendered (text is the fallback)
 */
export interface BrandWordmark {
  mode: BrandWordmarkMode;
  text: string;
  imageUrl: string | null;
}

/** Brand Icon / mark — rendered next to the wordmark, never instead of it. */
export interface BrandIcon {
  imageUrl: string | null;
}

/**
 * Brand identity settings (independent of the legacy logo/favicon fields).
 * wordmark and icon are deliberately separate: a wordmark image is never used
 * as the icon and the icon is never used as a wordmark replacement.
 */
export interface BrandIdentity {
  wordmark: BrandWordmark;
  icon: BrandIcon;
}

export interface SiteSettings {
  _id: any;
  brandName: string;
  logo: string;
  favicon: string;
  slogan: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: string;
  };
  layout: {
    headerStyle: string;
    footerStyle: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  socialLinks: Array<{
    platform: string;
    url: string;
    icon?: string;
  }>;
  policies: {
    privacy: string;
    terms: string;
    refund: string;
    shipping: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    defaultImage: string;
  };
  navbar: {
    items: Array<{
      label: string;
      url: string;
      sortOrder: number;
      isActive: boolean;
    }>;
  };
  footer: {
    sections: Array<{
      type: string;
      title?: string;
      content?: string;
      links?: Array<{ label: string; url: string }>;
      sortOrder: number;
      isActive: boolean;
    }>;
  };
  currency: string;
  /**
   * Currency product/cart/order amounts are stored in (see
   * DEFAULT_BASE_CURRENCY). Display currency = `currency`; conversion happens
   * once, at render time, via convertPrice().
   */
  baseCurrency?: string;
  /** Optional per-currency exchange rates (1 unit of base → X units of target). */
  exchangeRates?: Record<string, number>;
  /** Brand identity — wordmark + icon, normalized for the storefront. */
  brandIdentity?: BrandIdentity;
  taxRate: number;
  freeShippingThreshold: number;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  announcement?: {
    enabled?: boolean;
    messages?: string[];
  };
  homepageSections?: Array<{
    type: string;
    props?: any;
    sortOrder?: number;
    isActive?: boolean;
  }>;
  orderSettings?: {
    orderNumberPrefix?: string;
    orderNumberLength?: number;
    freeShippingThreshold?: number;
    taxRate?: number;
    flatShippingRate?: number;
    allowGuestCheckout?: boolean;
    requirePhoneForShipping?: boolean;
    autoFulfillDigital?: boolean;
  };
  emailSettings?: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    sendgridApiKey?: string;
    mailgunApiKey?: string;
    mailgunDomain?: string;
  };
  securitySettings?: {
    rateLimitApi?: number;
    rateLimitAuth?: number;
    passwordMinLength?: number;
    requirePasswordComplexity?: boolean;
    sessionTimeout?: number;
    requireEmailVerification?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  _id: any;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  collection?: string;
  collections?: string[]; // Merchandising collection slugs (summer-collection, ...). Marketing sections use the is* flags below.
  brand: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  taxCode?: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  stock: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  images: Array<{
    url: string;
    alt: string;
    isFeatured: boolean;
  }>;
  videos?: Array<{
    url: string;
    thumbnail: string;
  }>;
  models?: Array<{
    url: string;
    format: string;
  }>;
  variants: Array<{
    id: string;
    name: string;
    options: Record<string, string>;
    priceAdjustment: number;
    sku: string;
    stock: number;
    image?: string;
  }>;
  options: Array<{
    name: string;
    values: string[];
  }>;
  tags: string[];
  categoryPath?: string[];
  featured: boolean;
  featuredUntil?: Date;
  // Independent marketing flags (Shopify-style). A product may belong to any
  // number of these lists at once — none are mutually exclusive.
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
  isExclusive?: boolean;
  isLimitedEdition?: boolean;
  isEditorsPick?: boolean;
  isPremiumCollection?: boolean;
  status: 'draft' | 'active' | 'archived';
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  rating: {
    average: number;
    count: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  _id: any;
  name: string;
  slug: string;
  description?: string;
  subtitle?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  toObject?: () => any;
}

export type PromotionBannerScope = 'all' | 'selected';

export interface PromotionBanner {
  _id: any;
  name: string;
  isActive: boolean;
  scope: PromotionBannerScope;
  categorySlugs: string[];
  desktopImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  redirectUrl?: string;
  openInNewTab: boolean;
  startDate?: string;
  endDate?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  marginTop: number;
  marginBottom: number;
  overlayColor?: string;
  overlayOpacity: number;
  bannerOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Collection {
  _id: any;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  bannerTablet?: string;
  mobileBanner?: string;
  icon?: string;
  video?: string;
  products: string[]; // Legacy Product IDs (new system derives products from Product.collections)
  featured: boolean;
  sortOrder?: number;
  featuredUntil?: Date;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  showOnHomepage?: boolean;
  showInNavigation?: boolean;
  themeColor?: string;
  buttonColor?: string;
  buttonText?: string;
  productCount?: number;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export type HeroLinkType = 'collection' | 'category' | 'product' | 'custom';
export type HeroContentAlignment = 'left' | 'center' | 'right';
export type HeroAnimationStyle = 'slide' | 'fade' | 'kenburns';
export type HeroSlideAnimationType = 'fade' | 'zoom' | 'slide';
export type HeroBlockStatus = 'draft' | 'published';

export interface HeroButton {
  label?: string;
  linkType?: HeroLinkType;
  link?: string;
}

export interface HeroVisibility {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
}

export interface HeroSlide {
  _id?: any;
  image?: string;
  imageMobile?: string;
  video?: string;
  videoMobile?: string;
  eyebrow?: string;
  heading?: string;
  headingColor?: string;
  showEyebrow: boolean;
  showCta: boolean;
  ctaText?: string;
  ctaLinkType?: HeroLinkType;
  ctaLink?: string;
  description?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  backgroundColor?: string;
  animationType?: HeroSlideAnimationType;
  overlay?: boolean;
  overlayOpacity?: number;
  gradient?: boolean;
  textAlign?: HeroContentAlignment;
  buttonColor?: string;
  animationSpeed?: number;
  priority?: number;
  visibility?: HeroVisibility;
  status: HeroBlockStatus;
  isActive: boolean;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  altText?: string;
}

export interface HeroPanel {
  _id?: any;
  label?: string;
  slides: HeroSlide[];
  status: HeroBlockStatus;
  isActive: boolean;
}

export interface HeroBlock {
  _id: any;
  name: string;
  slides: HeroSlide[];
  animationSpeed: number;
  priority: number;
  status: HeroBlockStatus;
  isActive: boolean;
  /* Legacy panels structure — kept optional for one-time migration into slides */
  panels?: HeroPanel[];
  overlay: boolean;
  overlayOpacity: number;
  gradient: boolean;
  /* Legacy flat fields — kept optional for one-time migration into panels */
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  video?: string;
  imageMobile?: string;
  videoMobile?: string;
  badge?: string;
  primaryButton?: HeroButton;
  secondaryButton?: HeroButton;
  contentAlignment?: HeroContentAlignment;
  textColor?: string;
  buttonColor?: string;
  accentColor?: string;
  animationStyle?: HeroAnimationStyle;
  visibility?: HeroVisibility;
  seoLabel?: string;
  altText?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  _id: any;
  email?: string;
  password?: string; // Hashed
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  emailVerified: boolean;
  phoneVerified: boolean;
  role: 'customer' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  /** How this account authenticates: password (email), Google, or phone OTP. */
  authProvider?: 'email' | 'google' | 'phone';
  /** Google subject identifier for accounts created via Google Sign-In. */
  googleId?: string;
  /** Profile image URL (Google picture, uploaded avatar, or CDN). */
  avatar?: string;
  /** Consecutive failed password attempts (drives temporary lockout). */
  failedLoginAttempts?: number;
  /** Timestamp until which the account is locked after too many failures. */
  lockedUntil?: Date;
  /** Loyalty balance accumulated from orders and referrals. */
  rewardPoints?: number;
  addresses: Array<{
    id: string;
    type: 'billing' | 'shipping' | 'both';
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
  }>;
  preferences: {
    newsletter: boolean;
    marketing: boolean;
    orderUpdates: boolean;
  };
  wishlist: string[]; // Product IDs
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  loginCount?: number;
}

export interface OtpCode {
  _id: any;
  phone: string;
  /** sha256 hash of the 6-digit code (plaintext is never stored). */
  otpHash: string;
  purpose: 'login' | 'phone_verification';
  /** Failed verification attempts for this code. */
  attempts: number;
  /** Last time a code was sent to this phone (30s resend guard). */
  lastSentAt: Date;
  consumedAt?: Date;
  expiresAt: Date;
  createdAt?: Date;
}

export interface LoginHistoryEntry {
  _id: any;
  userId?: any;
  method: 'email' | 'google' | 'phone' | 'refresh';
  success: boolean;
  ip?: string;
  userAgent?: string;
  /** Phone or email used when the attempt did not resolve to a user. */
  identifier?: string;
  failedReason?: string;
  createdAt?: Date;
}

export interface UserSession {
  _id: any;
  userId: any;
  tokenHash: string;
  device?: string;
  ip?: string;
  userAgent?: string;
  lastActiveAt: Date;
  revokedAt?: Date;
  createdAt?: Date;
}

export interface AuthStats {
  totalUsers: number;
  byProvider: { email: number; google: number; phone: number };
  verified: number;
  unverified: number;
  statusBreakdown: Record<string, number>;
  failedLoginsLast30d: number;
  recentLoginHistory: LoginHistoryEntry[];
  activeSessions: number;
}

export interface Admin {
  _id: any;
  email: string;
  password: string; // Hashed
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'content_editor' | 'support';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  toObject?: () => any;
  comparePassword?: (candidatePassword: string) => Promise<boolean>;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  selectedOptions?: Record<string, string>;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  total: number;
  sku: string;
  image?: string;
}

export interface OrderStatusHistoryEntry {
  status: string;
  note?: string;
  changedBy?: string;
  changedAt: Date;
}

export interface OrderEmailHistoryEntry {
  type: 'confirmation' | 'shipping' | 'delivered';
  sentAt: Date;
}

export interface Order {
  _id: any;
  orderNumber: string;
  userId?: string; // For guest orders, this can be null
  guestEmail?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'razorpay' | 'stripe' | 'cod';
  paymentId?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  couponCode?: string;
  couponDiscount?: number;
  stockRestored?: boolean;
  statusHistory?: OrderStatusHistoryEntry[];
  emailHistory?: OrderEmailHistoryEntry[];
  createdAt?: Date;
  updatedAt?: Date;
  deliveredAt?: Date;
}

export interface Coupon {
  _id: any;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  startsAt?: Date;
  expiresAt?: Date;
  usageLimit: number;
  usageCount: number;
  perCustomerLimit?: number;
  customersUsed?: string[];
  appliesTo: 'all' | 'specific_products' | 'specific_categories' | 'specific_collections';
  productIds?: string[]; // If appliesTo is specific_products
  categoryIds?: string[]; // If appliesTo is specific_categories
  collectionIds?: string[]; // If appliesTo is specific_collections
  appliesToSaleItems: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  toObject?: () => any;
  isValid?: boolean;
  calculateDiscount?: (cartTotal: number, shipping?: number) => number;
}

export interface Review {
  _id: any;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images?: string[]; // URLs
  verifiedPurchase: boolean;
  helpfulVotes: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogPost {
  _id: any;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  gallery?: string[];
  author: string;
  tags: string[];
  category?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  publishedAt?: Date;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NewsletterSubscriber {
  _id: any;
  email: string;
  firstName?: string;
  lastName?: string;
  subscribedAt: Date;
  isActive: boolean;
  source?: string; // homepage, popup, etc.
  doubleOptIn?: boolean;
  confirmationToken?: string;
  confirmationExpires?: Date;
}

export interface Notification {
  _id: any;
  userId?: string; // Null for admin notifications
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  relatedId?: string; // ID of related entity (order, product, etc.)
  relatedType?: string; // 'order', 'product', etc.
  createdAt?: Date;
  readAt?: Date;
}

export interface AnalyticsEvent {
  _id: any;
  eventName: string;
  userId?: string;
  sessionId: string;
  properties: Record<string, any>;
  url: string;
  userAgent: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface InventoryItem {
  _id: any;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reserved: number;
  location: string; // Warehouse/bin location
  reorderPoint: number;
  maxStockLevel: number;
  cost: number;
  lastUpdated: Date;
}

export interface Payment {
  _id: any;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'razorpay' | 'stripe' | 'cod';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  transactionId?: string;
  gatewayResponse?: any;
  refundAmount?: number;
  refundReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MediaVariant {
  url: string;
  width: number;
  height: number;
  size?: number;
  format?: string;
}

export interface MediaDerived {
  url: string;
  width: number;
  height: number;
  ratio: string; // '3:4', '21:9', ...
  source: 'auto' | 'manual';
  createdAt: Date;
}

export interface MediaVersion {
  _id?: any;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  note?: string;
  createdAt: Date;
}

export interface MediaUsageEntry {
  scope: string; // 'products' | 'collections' | ...
  count: number;
  items: Array<{ id: string; name?: string }>;
}

export interface MediaFile {
  _id: any;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number; // For video/audio
  /** Auto-detected aspect ratio of the source image (e.g. '3:4', '21:9'). Null/absent = free ratio (SVG/video/unknown). */
  ratio?: string;
  altText?: string;
  caption?: string;
  title?: string;
  tags: string[];
  folder: string;
  uploadedBy: string; // User ID
  uploadedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  /** Duplicate detection hash (md5 of the original bytes). */
  checksum?: string;
  /** True when this upload was detected as a duplicate of an existing file. */
  duplicated?: boolean;
  favorite?: boolean;
  /** Auto-generated responsive variants (thumb / medium / large / avif). */
  variants?: {
    thumb?: MediaVariant;
    medium?: MediaVariant;
    large?: MediaVariant;
    avif?: MediaVariant;
    /** Ready-to-use `srcset` attribute value. */
    srcset?: string;
  };
  /** Ratio-fitted / user-cropped derivations (never touch the original). */
  derived?: MediaDerived[];
  /** Version history created by Replace operations. */
  versions?: MediaVersion[];
  /** Compression report vs the original file. */
  optimization?: {
    originalSize: number;
    optimizedSize: number;
    savingsPercent: number;
  };
  /** Last time the file was found referenced by storefront content. */
  lastUsedAt?: Date;
  /** Populated on-demand by the usage tracker endpoint. */
  usage?: MediaUsageEntry[] | null;
}

export interface Page {
  _id: any;
  title: string;
  slug: string;
  content: string; // HTML or JSON for dynamic content
  excerpt?: string;
  featuredImage?: string;
  status: 'draft' | 'published' | 'archived';
  isInMenu: boolean;
  menuOrder: number;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  layout?: string; // Reference to layout template
  createdBy: string; // User ID
  updatedBy?: string; // User ID
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Layout {
  _id: any;
  name: string;
  slug: string;
  thumbnail?: string;
  sections: Array<{
    id: string;
    type: string; // 'hero', 'product-grid', 'banner', etc.
    props: Record<string, any>;
  }>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ThemeTransform = 'none' | 'uppercase' | 'capitalize';

export interface ThemeFontSizeSet {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface ThemeTypography {
  headingFont: string;
  bodyFont: string;
  baseSize: ThemeFontSizeSet;
  headingSizes: {
    h1: ThemeFontSizeSet;
    h2: ThemeFontSizeSet;
    h3: ThemeFontSizeSet;
    h4: ThemeFontSizeSet;
    h5: ThemeFontSizeSet;
    small: ThemeFontSizeSet;
    eyebrow: ThemeFontSizeSet;
  };
  headingWeight: number;
  bodyWeight: number;
  headingTransform: ThemeTransform;
  headingLineHeight: number;
  bodyLineHeight: number;
  headingLetterSpacing: string;
  eyebrowTransform: ThemeTransform;
  eyebrowLetterSpacing: string;
}

export interface ThemeButtons {
  borderRadius: string;
  paddingX: string;
  paddingY: string;
  fontSize: string;
  fontWeight: number;
  textTransform: ThemeTransform;
  letterSpacing: string;
  primaryBg: string;
  primaryText: string;
  primaryHoverBg: string;
  goldBg: string;
  goldText: string;
  goldHoverBg: string;
  outlineText: string;
  outlineBorder: string;
  outlineHoverBg: string;
  outlineHoverText: string;
  ghostText: string;
  whiteBg: string;
  whiteText: string;
  whiteHoverBg: string;
}

export interface ThemeHeaderConfig {
  height: string;
  sticky: boolean;
  showAnnouncementBar: boolean;
}

export interface ThemeFooterConfig {
  paddingY: string;
}

export interface ThemeEffects {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  transition: string;
  marqueeDuration: string;
}

export interface ThemeSettings {
  _id: any;
  name: string;
  description?: string;
  isActive: boolean;
  isDark: boolean;
  colors: Record<string, string>;
  typography: ThemeTypography;
  buttons: ThemeButtons;
  header: ThemeHeaderConfig;
  footer: ThemeFooterConfig;
  effects: ThemeEffects;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthToken {
  userId: string;
  token: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  createdAt?: Date;
}

export interface Cart {
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  couponDiscount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Wishlist {
  _id: any;
  userId: string;
  productIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogCategory {
  _id: any;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogComment {
  _id: any;
  blogPostId: string;
  userId?: string;
  name: string;
  email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContactMessage {
  _id: any;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'responded' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditLog {
  _id: any;
  action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'reorder' | 'duplicate' | 'transfer';
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FAQ {
  _id: any;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IAuthToken = AuthToken;
export type IBlogCategory = BlogCategory;
export type IBlogComment = BlogComment;
export type ICart = Cart;
export type ICartItem = CartItem;
export type IOrderItem = OrderItem;
export type IWishlist = Wishlist;
export type ISiteSettings = SiteSettings;
export type IProduct = Product;
export type ICategory = Category;
export type ICollection = Collection;
export type IUser = User;
export type IAdmin = Admin;
export type IOrder = Order;
export type ICoupon = Coupon;
export type IReview = Review;
export type IBlogPost = BlogPost;
export type INewsletterSubscriber = NewsletterSubscriber;
export type INotification = Notification;
export type IAnalyticsEvent = AnalyticsEvent;
export type IInventoryItem = InventoryItem;
export type IPayment = Payment;
export type IMediaFile = MediaFile;
export type IPage = Page;
export type ILayout = Layout;
export type IThemeSettings = ThemeSettings;
export type IApiResponse = ApiResponse<any>;
export type IPaginatedResponse = PaginatedResponse<any>;
export type IAuditLog = AuditLog;
export type IFAQ = FAQ;