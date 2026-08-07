import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface UnsavedChangesContextValue {
  dirty: boolean;
  setDirty: (value: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  dirty: false,
  setDirty: () => undefined,
});

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    const handleClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const target = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (href === window.location.pathname) return;
      const ok = window.confirm('You have unsaved changes. Leave this page anyway?');
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('click', handleClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('click', handleClick, true);
    };
  }, []);

  const setDirtySafe = useCallback((value: boolean) => setDirty(value), []);

  return (
    <UnsavedChangesContext.Provider value={{ dirty, setDirty: setDirtySafe }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
