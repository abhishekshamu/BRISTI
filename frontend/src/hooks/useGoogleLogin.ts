import { useCallback, useEffect, useRef, useState } from 'react';

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: { theme?: string; size?: string; shape?: string; text?: string; width?: number }) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GIS_SCRIPT_ID = 'google-gis-script';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    if (document.getElementById(GIS_SCRIPT_ID)) {
      window.addEventListener('load', () => {
        if (window.google?.accounts) resolve();
        else reject(new Error('Google Identity Services failed to initialise'));
      });
      return;
    }
    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * useGoogleLogin — wires up Google Identity Services "Sign in with Google".
 *
 * When VITE_GOOGLE_CLIENT_ID is not configured (development), the hook stays
 * inert and the calling component can render its fallback state via isConfigured.
 */
export function useGoogleLogin(onCredential: (credential: string) => Promise<void> | void) {
  const [isConfigured] = useState(() => Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef<HTMLElement | null>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled) return;
        setIsScriptLoaded(true);
      })
      .catch((error: Error) => {
        if (!cancelled) console.error('[google]', error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isConfigured]);

  const renderButton = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !isScriptLoaded || !window.google?.accounts) return;
      buttonRef.current = element;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setIsLoading(true);
          try {
            await callbackRef.current(response.credential);
          } finally {
            setIsLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 0,
      });
    },
    [isScriptLoaded],
  );

  return { isConfigured, isScriptLoaded, isLoading, renderButton };
}
