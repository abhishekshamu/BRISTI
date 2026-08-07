/**
 * Shared types for the unified Visual Builder.
 *
 * One engine drives every page in the admin: sections live on a canvas, are
 * configured through a single property inspector, use one media system, one
 * save system and one preview. Storage differs per page kind — the homepage
 * persists to `settings.homepageSections` (+ `/hero` + `/promotion-banners`),
 * all other pages persist to Page documents — but the editing model is shared.
 */

export interface BuilderSection {
  id: string;
  type: string;
  props: Record<string, any>;
  order: number;
  /** Optional display override for blueprint rows that mirror a specific
   * storefront section (e.g. "Collection Banner" for a product image banner). */
  label?: string;
  /** Canvas-level visibility: hidden sections stay in the list but are dimmed. */
  visible?: boolean;
  /** True when the section mirrors a real storefront section (blueprint) that
   * renders live API data and cannot be persisted to a Page document. */
  live?: boolean;
  /** Layout sections (announcement bar, navbar, footer) render on every page. */
  layout?: boolean;
}

/** Real storefront data loaded by the builder so the canvas mirrors the site. */
export interface BuilderLiveData {
  products: number;
  collections: number;
  categories: number;
  blogs: number;
  reviews: number;
  announcements: string[];
  navbarItems: number;
  footerLinks: number;
  faqs: number;
}

export type SectionScope = 'homepage' | 'pages' | 'all';

export interface SectionTypeMeta {
  type: string;
  label: string;
  icon: React.ElementType;
  configurable: boolean;
  description: string;
  scope: SectionScope;
  /** Entity-backed sections pull their editor from a dedicated store. */
  entity?: 'hero' | 'banner';
  /** Live-data sections render real storefront content with no manual config. */
  live?: boolean;
  /** Layout sections render on every page (announcement bar, navbar, footer). */
  layout?: boolean;
  /** Live-data badge text, e.g. "{count} products live". */
  liveLabel?: string;
}

/** Storage backends the Visual Builder can edit. Blueprint-only stores mirror
 * real storefront routes backed by live catalog data (no Page document). */
export type PageStore = 'homepage' | 'page' | 'landing' | 'collection' | 'category' | 'product' | 'blog';

export interface PageDef {
  key: string;
  label: string;
  slug: string | null;
  store: PageStore;
}

/** Draft hero set — the shape POST/PUT /hero accept (slides + set fields). */
export interface HeroSlideDraft {
  localId: string;
  image: string;
  imageMobile: string;
  video: string;
  videoMobile: string;
  eyebrow: string;
  heading: string;
  headingColor: string;
  showEyebrow: boolean;
  showCta: boolean;
  ctaText: string;
  ctaLinkType: string;
  ctaLink: string;
  description: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundColor: string;
  animationType: string;
  overlay: boolean;
  overlayOpacity: number;
  gradient: boolean;
  textAlign: 'left' | 'center' | 'right';
  buttonColor: string;
  animationSpeed: number;
  priority: number;
  visibilityDesktop: boolean;
  visibilityTablet: boolean;
  visibilityMobile: boolean;
  status: 'draft' | 'published';
  isActive: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  altText: string;
}

export interface HeroSetDraft {
  _id?: string;
  localId: string;
  name: string;
  status: 'draft' | 'published';
  isActive: boolean;
  priority: number;
  animationSpeed: number;
  slides: HeroSlideDraft[];
}

/** Draft campaign banner — the shape POST/PUT /promotion-banners accept. */
export interface BannerDraft {
  _id?: string;
  localId: string;
  name: string;
  isActive: boolean;
  scope: 'all' | 'selected';
  categorySlugs: string[];
  desktopImage: string;
  tabletImage: string;
  mobileImage: string;
  redirectUrl: string;
  openInNewTab: boolean;
  startDate: string;
  endDate: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  marginTop: number;
  marginBottom: number;
  overlayColor: string;
  overlayOpacity: number;
  bannerOrder: number;
}
