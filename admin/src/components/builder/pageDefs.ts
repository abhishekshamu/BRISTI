import type { PageDef } from './types';

/**
 * Every page the Visual Builder can edit — mirroring the real storefront
 * routes in frontend/src/App.tsx.
 *
 * - `homepage` persists to `settings.homepageSections` (+ /hero + /promotion-banners)
 * - `landing` pages are chosen from existing Page documents
 * - every other page mirrors a real storefront route; the builder loads the
 *   real sections that route renders (blueprint) plus any Page document
 *   configuration (title, slug, SEO, content, builder sections).
 */
export const PAGES: PageDef[] = [
  { key: 'homepage', label: 'Homepage', slug: null, store: 'homepage' },
  { key: 'shop', label: 'Shop', slug: 'shop', store: 'page' },
  { key: 'collections', label: 'Collections', slug: 'collections', store: 'page' },
  { key: 'collection-details', label: 'Collection Details', slug: null, store: 'collection' },
  { key: 'category', label: 'Category', slug: null, store: 'category' },
  { key: 'product', label: 'Product', slug: null, store: 'product' },
  { key: 'blog-listing', label: 'Blog Listing', slug: 'journal', store: 'page' },
  { key: 'single-blog', label: 'Single Blog', slug: null, store: 'blog' },
  { key: 'journal', label: 'Journal', slug: 'journal', store: 'page' },
  { key: 'about', label: 'About', slug: 'about', store: 'page' },
  { key: 'contact', label: 'Contact', slug: 'contact', store: 'page' },
  { key: 'faq', label: 'FAQ', slug: 'faq', store: 'page' },
  { key: 'sale', label: 'Sale', slug: 'sale', store: 'page' },
  { key: 'new-arrivals', label: 'New Arrivals', slug: 'new-arrivals', store: 'page' },
  { key: 'search', label: 'Search', slug: 'search', store: 'page' },
  { key: 'wishlist', label: 'Wishlist', slug: 'wishlist', store: 'page' },
  { key: 'cart', label: 'Cart', slug: 'cart', store: 'page' },
  { key: 'checkout', label: 'Checkout', slug: 'checkout', store: 'page' },
  { key: 'account', label: 'Account', slug: 'account', store: 'page' },
  { key: 'landing', label: 'Landing Pages', slug: null, store: 'landing' },
  { key: '404', label: '404', slug: '404', store: 'page' },
  { key: 'coming-soon', label: 'Coming Soon', slug: 'coming-soon', store: 'page' },
  { key: 'maintenance', label: 'Maintenance', slug: 'maintenance', store: 'page' },
];
