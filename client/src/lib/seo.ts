import { DEFAULT_SETTINGS } from '@shared/constants';

export interface SeoInput {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  type?: string;
  url?: string;
}

export function setDocumentMeta(seo?: SeoInput): void {
  const title = seo?.title ?? DEFAULT_SETTINGS.seo.defaultTitle;
  const description = seo?.description ?? DEFAULT_SETTINGS.seo.defaultDescription;
  const image = seo?.image ?? DEFAULT_SETTINGS.seo.defaultImage;

  document.title = title;

  setMeta('description', description);
  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:type', seo?.type ?? 'website');
  setMeta('og:url', seo?.url ?? window.location.href);
  setMeta('og:image', image);
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);
  setMeta('keywords', seo?.keywords?.join(', ') ?? '');

  const canonical = document.querySelector('link[rel="canonical"]');
  const href = window.location.origin + window.location.pathname;
  if (canonical) {
    canonical.setAttribute('href', href);
  } else {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = href;
    document.head.appendChild(link);
  }
}

function setMeta(name: string, content: string): void {
  if (!content) return;
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    const key = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
    element.setAttribute(key, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function usePageMeta(seo?: SeoInput): void {
  setDocumentMeta(seo);
}
