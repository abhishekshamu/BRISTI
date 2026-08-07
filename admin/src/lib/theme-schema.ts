export interface ColorTokenDef {
  key: string;
  label: string;
}

export interface ColorGroupDef {
  id: string;
  label: string;
  tokens: ColorTokenDef[];
}

export const COLOR_GROUPS: ColorGroupDef[] = [
  {
    id: 'base',
    label: 'Brand & Base Palette',
    tokens: [
      { key: 'background', label: 'Background' },
      { key: 'foreground', label: 'Foreground' },
      { key: 'primary', label: 'Primary' },
      { key: 'primaryForeground', label: 'Primary Text' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'secondaryForeground', label: 'Secondary Text' },
      { key: 'accent', label: 'Accent (Gold)' },
      { key: 'accentForeground', label: 'Accent Text' },
      { key: 'muted', label: 'Muted' },
      { key: 'mutedForeground', label: 'Muted Text' },
      { key: 'card', label: 'Card' },
      { key: 'cardForeground', label: 'Card Text' },
      { key: 'popover', label: 'Popover' },
      { key: 'popoverForeground', label: 'Popover Text' },
      { key: 'border', label: 'Border' },
      { key: 'input', label: 'Input Border' },
      { key: 'ring', label: 'Focus Ring' },
      { key: 'destructive', label: 'Destructive' },
      { key: 'destructiveForeground', label: 'Destructive Text' },
      { key: 'success', label: 'Success' },
      { key: 'gold', label: 'Gold' },
    ],
  },
  {
    id: 'surfaces',
    label: 'Dark Luxury Surfaces',
    tokens: [
      { key: 'ink', label: 'Ink (Dark Section)' },
      { key: 'inkSoft', label: 'Ink Soft' },
      { key: 'inkMuted', label: 'Ink Muted' },
      { key: 'goldLight', label: 'Gold Light' },
      { key: 'goldDark', label: 'Gold Dark' },
      { key: 'onInk', label: 'On Ink (Text)' },
      { key: 'onInkMuted', label: 'On Ink Muted' },
      { key: 'onInkDim', label: 'On Ink Dim' },
      { key: 'onInkFaint', label: 'On Ink Faint' },
      { key: 'ice', label: 'Ice (White Surface)' },
    ],
  },
  {
    id: 'header',
    label: 'Header',
    tokens: [
      { key: 'headerBackground', label: 'Background' },
      { key: 'headerText', label: 'Text' },
      { key: 'headerTextHover', label: 'Text Hover' },
      { key: 'headerBorder', label: 'Border' },
      { key: 'headerAccent', label: 'Accent' },
      { key: 'headerDropdownBg', label: 'Dropdown Background' },
      { key: 'headerDropdownText', label: 'Dropdown Text' },
    ],
  },
  {
    id: 'announcement',
    label: 'Announcement Bar',
    tokens: [
      { key: 'announcementBackground', label: 'Background' },
      { key: 'announcementText', label: 'Text' },
      { key: 'announcementAccent', label: 'Accent' },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    tokens: [
      { key: 'navBackground', label: 'Background' },
      { key: 'navText', label: 'Text' },
      { key: 'navHover', label: 'Hover' },
      { key: 'navActive', label: 'Active' },
      { key: 'navSubmenuBg', label: 'Submenu Background' },
      { key: 'navSubmenuText', label: 'Submenu Text' },
      { key: 'navMobileBg', label: 'Mobile Background' },
      { key: 'navMobileText', label: 'Mobile Text' },
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    tokens: [
      { key: 'footerBackground', label: 'Background' },
      { key: 'footerText', label: 'Text' },
      { key: 'footerHeading', label: 'Heading' },
      { key: 'footerLink', label: 'Links' },
      { key: 'footerLinkHover', label: 'Link Hover' },
      { key: 'footerBorder', label: 'Border' },
    ],
  },
  {
    id: 'productCards',
    label: 'Product Cards',
    tokens: [
      { key: 'productCardBg', label: 'Card Background' },
      { key: 'productBadgeBg', label: 'Badge Background' },
      { key: 'productBadgeText', label: 'Badge Text' },
      { key: 'productPrice', label: 'Price' },
      { key: 'productTitle', label: 'Title' },
      { key: 'productBrand', label: 'Brand' },
      { key: 'productSale', label: 'Sale Color' },
      { key: 'productOverlayBg', label: 'Hover Overlay Background' },
      { key: 'productOverlayText', label: 'Hover Overlay Text' },
    ],
  },
  {
    id: 'forms',
    label: 'Forms & Inputs',
    tokens: [
      { key: 'formBg', label: 'Background' },
      { key: 'formText', label: 'Text' },
      { key: 'formPlaceholder', label: 'Placeholder' },
      { key: 'formBorder', label: 'Border' },
      { key: 'formFocus', label: 'Focus Color' },
    ],
  },
  {
    id: 'hero',
    label: 'Hero Section',
    tokens: [
      { key: 'heroBackground', label: 'Background' },
      { key: 'heroText', label: 'Heading Text' },
      { key: 'heroSubtext', label: 'Subtext' },
      { key: 'heroAccent', label: 'Accent' },
      { key: 'heroOverlayA', label: 'Overlay Start' },
      { key: 'heroOverlayB', label: 'Overlay End' },
      { key: 'heroGlowColor', label: 'Glow Color' },
    ],
  },
  {
    id: 'collection',
    label: 'Collection Sections',
    tokens: [
      { key: 'collectionBackground', label: 'Background' },
      { key: 'collectionText', label: 'Text' },
      { key: 'collectionAccent', label: 'Accent' },
      { key: 'collectionOverlay', label: 'Image Overlay' },
      { key: 'collectionTitle', label: 'Title' },
      { key: 'collectionDesc', label: 'Description' },
    ],
  },
  {
    id: 'homepageTheme',
    label: 'Homepage Theme',
    tokens: [
      { key: 'featuredCategoryBorder', label: 'Featured Category Border Color' },
    ],
  },
  {
    id: 'shop',
    label: 'Shop Page',
    tokens: [
      { key: 'shopBackground', label: 'Background' },
      { key: 'shopText', label: 'Text' },
      { key: 'shopAccent', label: 'Accent' },
      { key: 'shopFilterBg', label: 'Filter Background' },
      { key: 'shopFilterBorder', label: 'Filter Border' },
      { key: 'shopFilterText', label: 'Filter Text' },
    ],
  },
  {
    id: 'productPage',
    label: 'Product Page',
    tokens: [
      { key: 'productPageBackground', label: 'Background' },
      { key: 'productPageText', label: 'Text' },
      { key: 'productPageAccent', label: 'Accent' },
      { key: 'productPriceColor', label: 'Price' },
      { key: 'productSaleColor', label: 'Sale Price' },
      { key: 'productTabBg', label: 'Tab Background' },
      { key: 'productTabActiveBg', label: 'Tab Active Background' },
      { key: 'productTabText', label: 'Tab Text' },
    ],
  },
  {
    id: 'cart',
    label: 'Cart',
    tokens: [
      { key: 'cartBackground', label: 'Background' },
      { key: 'cartText', label: 'Text' },
      { key: 'cartAccent', label: 'Accent' },
      { key: 'cartSummaryBg', label: 'Summary Background' },
      { key: 'cartSummaryBorder', label: 'Summary Border' },
    ],
  },
  {
    id: 'checkout',
    label: 'Checkout',
    tokens: [
      { key: 'checkoutBackground', label: 'Background' },
      { key: 'checkoutText', label: 'Text' },
      { key: 'checkoutAccent', label: 'Accent' },
      { key: 'checkoutInputBg', label: 'Input Background' },
      { key: 'checkoutInputBorder', label: 'Input Border' },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    tokens: [
      { key: 'blogBackground', label: 'Background' },
      { key: 'blogText', label: 'Text' },
      { key: 'blogAccent', label: 'Accent' },
      { key: 'blogCardBg', label: 'Card Background' },
      { key: 'blogCardBorder', label: 'Card Border' },
    ],
  },
  {
    id: 'cms',
    label: 'CMS Pages',
    tokens: [
      { key: 'cmsBackground', label: 'Background' },
      { key: 'cmsText', label: 'Text' },
      { key: 'cmsAccent', label: 'Accent' },
      { key: 'cmsHeading', label: 'Heading' },
      { key: 'cmsLink', label: 'Links' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    tokens: [
      { key: 'accountBackground', label: 'Background' },
      { key: 'accountText', label: 'Text' },
      { key: 'accountAccent', label: 'Accent' },
      { key: 'accountCardBg', label: 'Card Background' },
    ],
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    tokens: [
      { key: 'wishlistBackground', label: 'Background' },
      { key: 'wishlistText', label: 'Text' },
      { key: 'wishlistAccent', label: 'Accent' },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    tokens: [
      { key: 'searchBackground', label: 'Background' },
      { key: 'searchText', label: 'Text' },
      { key: 'searchAccent', label: 'Accent' },
      { key: 'searchOverlay', label: 'Overlay' },
      { key: 'searchResultBg', label: 'Results Background' },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    tokens: [
      { key: 'mobileDrawerBg', label: 'Drawer Background' },
      { key: 'mobileDrawerText', label: 'Drawer Text' },
      { key: 'mobileNavBg', label: 'Nav Background' },
      { key: 'mobileNavBorder', label: 'Nav Border' },
    ],
  },
  {
    id: 'functional',
    label: 'Functional Colors',
    tokens: [
      { key: 'backdrop', label: 'Modal Backdrop' },
      { key: 'backdropStrong', label: 'Modal Backdrop (Strong)' },
      { key: 'imageOverlay', label: 'Image Hover Overlay' },
    ],
  },
];

export const FONT_OPTIONS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Georgia',
  'Merriweather',
  'Inter',
  'Montserrat',
  'Poppins',
  'Lato',
  'Open Sans',
];

export const TRANSFORM_OPTIONS = ['none', 'uppercase', 'capitalize'] as const;

export const HEADING_SIZE_FIELDS = [
  { key: 'h1', label: 'H1' },
  { key: 'h2', label: 'H2' },
  { key: 'h3', label: 'H3' },
  { key: 'h4', label: 'H4' },
  { key: 'h5', label: 'H5' },
  { key: 'small', label: 'Small' },
  { key: 'eyebrow', label: 'Eyebrow' },
] as const;

export const BREAKPOINT_LABELS: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};
