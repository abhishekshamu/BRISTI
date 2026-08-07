import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { siteService } from '@/services/site.service';
import { applyTheme } from '@/lib/theme-engine';
import { mergeThemeWithDefaults } from '@shared/theme';
import type { ThemeSettings } from '@shared/types';

interface ServerThemeContextValue {
  theme: ThemeSettings | null;
  version: number;
  refresh: () => Promise<void>;
}

const ServerThemeContext = createContext<ServerThemeContextValue | undefined>(undefined);

// Module-level in-flight dedupe: multiple mounts (e.g. React StrictMode's
// dev double-mount) share a single GET /theme request instead of firing
// duplicates. The active theme is fetched once per page load and cached in
// context state; the API is only re-queried when refresh() is called.
let activeThemeRequest: Promise<ThemeSettings> | null = null;

function fetchActiveTheme(): Promise<ThemeSettings> {
  activeThemeRequest ??= siteService.getActiveTheme().finally(() => {
    activeThemeRequest = null;
  });
  return activeThemeRequest;
}

export function ServerThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [version, setVersion] = useState(0);
  const lastApplied = useRef<string>('');

  const refresh = useCallback(async () => {
    try {
      const data = await fetchActiveTheme();
      const signature = JSON.stringify(data);
      setTheme(data);
      if (signature !== lastApplied.current) {
        lastApplied.current = signature;
        applyTheme(data);
        setVersion((v) => v + 1);
      }
    } catch {
      applyTheme(mergeThemeWithDefaults(null) as unknown as ThemeSettings);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ theme, version, refresh }), [theme, version, refresh]);

  return <ServerThemeContext.Provider value={value}>{children}</ServerThemeContext.Provider>;
}

export function useServerTheme(): ServerThemeContextValue {
  const context = useContext(ServerThemeContext);
  if (!context) throw new Error('useServerTheme must be used within a ServerThemeProvider');
  return context;
}
