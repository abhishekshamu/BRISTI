const STORAGE_KEY = 'bristi_recently_viewed';
const MAX_IDS = 12;

export function getRecentlyViewedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function trackRecentlyViewed(productId: string): string[] {
  const ids = getRecentlyViewedIds().filter((id) => id !== productId);
  ids.unshift(productId);
  const trimmed = ids.slice(0, MAX_IDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable (private mode etc.) — tracking is best-effort
  }
  return trimmed;
}
