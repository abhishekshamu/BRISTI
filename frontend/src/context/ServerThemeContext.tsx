import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { siteService } from '@/services/site.service';
import { applyTheme, THEME_POLL_INTERVAL } from '@/lib/theme-engine';
import { mergeThemeWithDefaults } from '@shared/theme';
import type { ThemeSettings } from '@shared/types';

interface ServerThemeContextValue {
  theme: ThemeSettings | null;
  version: number;
  refresh: () => Promise<void>;
}

const ServerThemeContext = createContext<ServerThemeContextValue | undefined>(undefined);

export function ServerThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [version, setVersion] = useState(0);
  const lastApplied = useRef<string>('');

  const refresh = useCallback(async () => {
    try {
      const data = await siteService.getActiveTheme();
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
    const interval = setInterval(refresh, THEME_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo(() => ({ theme, version, refresh }), [theme, version, refresh]);

  return <ServerThemeContext.Provider value={value}>{children}</ServerThemeContext.Provider>;
}

export function useServerTheme(): ServerThemeContextValue {
  const context = useContext(ServerThemeContext);
  if (!context) throw new Error('useServerTheme must be used within a ServerThemeProvider');
  return context;
}
