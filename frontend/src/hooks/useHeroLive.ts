import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';

export function useHeroLive(queryClient: QueryClient): void {
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/hero/events');
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['hero', 'active'] });
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, [queryClient]);
}
