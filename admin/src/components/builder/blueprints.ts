/**
 * Page blueprints — the real sections each storefront route renders, in the
 * real rendering order (mirrors frontend/src/App.tsx + page components).
 *
 * Every blueprint entry is marked `live` so the Visual Builder shows the exact
 * storefront composition with live API data, never placeholders. Only
 * user-added configurable sections are persisted to Page documents.
 */
export interface BlueprintSection {
  type: string;
  label?: string;
}

export const LAYOUT_SECTIONS: BlueprintSection[] = [
  { type: 'announcement-bar' },
  { type: 'navbar' },
  { type: 'footer' },
];

export const PAGE_BLUEPRINTS: Record<string, BlueprintSection[]> = {
  homepage: [
    { type: 'hero' },
    { type: 'luxuryCategories' },
    { type: 'featuredCollections' },
    { type: 'newArrivals' },
    { type: 'bestSellers' },
    { type: 'trending' },
    { type: 'customerReviews' },
    { type: 'journal' },
  ],
  shop: [
    { type: 'page-header' },
    { type: 'category-filter' },
    { type: 'product-grid', label: 'Product Grid (shop results)' },
  ],
  collections: [
    { type: 'page-header' },
    { type: 'collection-grid' },
  ],
  'collection-details': [
    { type: 'page-header', label: 'Collection Header' },
    { type: 'banner', label: 'Collection Banner' },
    { type: 'product-grid', label: 'Product Grid (collection products)' },
  ],
  category: [
    { type: 'page-header', label: 'Category Header' },
    { type: 'product-grid', label: 'Product Grid (category products)' },
  ],
  product: [
    { type: 'page-header', label: 'Breadcrumb' },
    { type: 'image-gallery', label: 'Product Media' },
    { type: 'text', label: 'Product Info' },
    { type: 'testimonials', label: 'Reviews & Rating' },
    { type: 'product-carousel', label: 'Related Products' },
    { type: 'product-carousel', label: 'Recently Viewed' },
  ],
  'blog-listing': [
    { type: 'page-header' },
    { type: 'editorial', label: 'Featured Story' },
    { type: 'blog-preview', label: 'Blog Post Grid' },
  ],
  'single-blog': [
    { type: 'page-header', label: 'Article Header' },
    { type: 'banner', label: 'Featured Image' },
    { type: 'image-gallery' },
    { type: 'text', label: 'Article Body' },
    { type: 'blog-preview', label: 'Related Posts' },
  ],
  journal: [
    { type: 'page-header' },
    { type: 'editorial', label: 'Featured Story' },
    { type: 'blog-preview', label: 'Blog Post Grid' },
  ],
  about: [
    { type: 'page-header' },
    { type: 'text', label: 'About Content (CMS)' },
    { type: 'brand-story', label: 'Brand Story' },
  ],
  contact: [
    { type: 'page-header' },
    { type: 'text', label: 'Contact Information' },
    { type: 'contact-form' },
  ],
  faq: [
    { type: 'page-header' },
    { type: 'faq' },
    { type: 'text', label: 'Page Content (CMS)' },
  ],
  sale: [
    { type: 'page-header' },
    { type: 'product-grid', label: 'Product Grid (sale products)' },
  ],
  'new-arrivals': [
    { type: 'page-header' },
    { type: 'product-grid', label: 'Product Grid (new arrivals)' },
  ],
  search: [
    { type: 'page-header' },
    { type: 'search-results' },
  ],
  wishlist: [
    { type: 'page-header' },
    { type: 'wishlist-grid' },
  ],
  cart: [
    { type: 'page-header' },
    { type: 'cart-items' },
    { type: 'order-summary' },
  ],
  checkout: [
    { type: 'page-header' },
    { type: 'checkout-form' },
    { type: 'order-summary' },
  ],
  account: [
    { type: 'page-header', label: 'Account Header' },
    { type: 'account-dashboard' },
  ],
  404: [
    { type: 'text', label: '404 Hero' },
  ],
  'coming-soon': [
    { type: 'text', label: 'Coming Soon Hero' },
  ],
  maintenance: [
    { type: 'text', label: 'Maintenance Notice' },
  ],
  landing: [],
};

export function blueprintFor(pageKey: string): BlueprintSection[] {
  return PAGE_BLUEPRINTS[pageKey] ?? [];
}
