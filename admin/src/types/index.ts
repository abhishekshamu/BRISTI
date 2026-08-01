export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string | Category;
  collection?: string;
  brand?: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight: number;
  stock: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  images: Array<{ url: string; alt?: string; isFeatured?: boolean }>;
  videos?: Array<{ url: string; thumbnail?: string }>;
  variants?: any[];
  options?: any[];
  tags?: string[];
  categoryPath?: string[];
  featured: boolean;
  featuredUntil?: string;
  status: 'draft' | 'active' | 'archived';
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  rating?: {
    average: number;
    count: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  products: string[];
  featured: boolean;
  sortOrder?: number;
  featuredUntil?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type HeroLinkType = 'collection' | 'category' | 'product' | 'custom';
export type HeroStatus = 'draft' | 'published';

export interface HeroSlide {
  _id?: string;
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
  status: HeroStatus;
  isActive: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
  altText?: string;
}

export interface HeroPanel {
  _id?: string;
  label?: string;
  slides: HeroSlide[];
  status: HeroStatus;
  isActive: boolean;
}

export interface HeroBlock {
  _id: string;
  name: string;
  panels: HeroPanel[];
  overlay: boolean;
  overlayOpacity: number;
  gradient: boolean;
  animationSpeed: number;
  priority: number;
  status: HeroStatus;
  isActive: boolean;
  /* Legacy flat fields — kept optional for one-time migration */
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  video?: string;
  imageMobile?: string;
  videoMobile?: string;
  badge?: string;
  primaryButton?: { label?: string; linkType?: HeroLinkType; link?: string };
  secondaryButton?: { label?: string; linkType?: HeroLinkType; link?: string };
  contentAlignment?: 'left' | 'center' | 'right';
  textColor?: string;
  buttonColor?: string;
  accentColor?: string;
  animationStyle?: 'slide' | 'fade' | 'kenburns';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  seoLabel?: string;
  altText?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit: number;
  usageCount: number;
  perCustomerLimit?: number;
  appliesTo: 'all' | 'specific_products' | 'specific_categories' | 'specific_collections';
  productIds?: string[];
  categoryIds?: string[];
  collectionIds?: string[];
  appliesToSaleItems: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  items: any[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string;
  shippingAddress: any;
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  couponCode?: string;
  couponDiscount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Page {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status: 'draft' | 'published' | 'archived';
  isInMenu: boolean;
  menuOrder: number;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  layout?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPost {
  _id: string;
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
  publishedAt?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt?: string;
  readAt?: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reserved: number;
  location: string;
  reorderPoint: number;
  maxStockLevel: number;
  cost: number;
  lastUpdated: string;
}

export interface MediaFile {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  tags: string[];
  folder: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ThemeSettings {
  _id: string;
  name: string;
  isActive: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
    gold: string;
    darkGray: string;
    lightGray: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: string;
    scale: number;
  };
  borderRadius: string;
  boxShadow: string;
  transition: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSettings {
  _id: string;
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
    icon: string;
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
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeoSettings {
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  facebookAppId?: string;
  twitterHandle?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  structuredData: boolean;
  openGraph: boolean;
  twitterCards: boolean;
}

export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}