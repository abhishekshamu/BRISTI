import { buildGoogleFontsUrl } from '@shared/utils';

const loadedSignatures = new Set<string>();

/**
 * Lazily injects the Google Fonts stylesheet for a single family. Cached per
 * family+weights signature so the admin never issues duplicate requests and
 * never loads fonts that are not needed.
 */
export function loadGoogleFont(family: string, weights: number[], italic = false): void {
  if (typeof document === 'undefined') return;
  const signature = `${family}|${weights.join(',')}|${italic ? 'i' : 'n'}`;
  if (loadedSignatures.has(signature)) return;
  loadedSignatures.add(signature);

  const url = buildGoogleFontsUrl([{ family, weights, italic }]);
  if (!url) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Loads the fonts currently visible in the font picker list (Intersection
 * Observer driven) so dropdown previews render in their own typeface without
 * pulling the whole library at once.
 */
export function loadFontsForPreview(families: Array<{ family: string; weights: number[]; italic: boolean }>): void {
  for (const font of families) {
    loadGoogleFont(font.family, font.weights, font.italic);
  }
}