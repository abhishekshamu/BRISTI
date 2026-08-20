import { API_ORIGIN } from './api';

/**
 * Resolve a stored media URL for <img>/<video> use.
 * - Absolute http(s) URLs pointing at a dev host (localhost/127.0.0.1) are
 *   rewritten to the configured API origin — media stored while the backend
 *   ran locally embeds such URLs and they 404 everywhere else.
 * - Other absolute http(s) URLs (e.g. Cloudinary secure_url) are unchanged.
 * - Backend-served relative paths (/uploads/...) get the API origin prepended,
 *   otherwise they resolve to the admin origin and 404.
 * - Any other relative path is left untouched (frontend public assets).
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const isDevHost =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0';
      if (isDevHost) {
        const path = parsed.pathname + parsed.search;
        return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
      }
    } catch {
      /* fall through to default handling */
    }
    return url;
  }
  if (url.startsWith('/uploads/')) return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  if (url.startsWith('/')) return url;
  return url;
}