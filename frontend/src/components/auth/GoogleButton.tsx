import { useRef, useEffect } from 'react';
import { useGoogleLogin } from '@/hooks/useGoogleLogin';
import { Loader2 } from 'lucide-react';

/**
 * GoogleButton — "Sign in with Google" button.
 *
 * Renders Google's official Identity Services button when configured; in
 * development without VITE_GOOGLE_CLIENT_ID a branded placeholder is shown
 * so the layout stays testable.
 */
export function GoogleButton({ onCredential, label = 'Continue with Google' }: { onCredential: (credential: string) => Promise<void> | void; label?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { isConfigured, isScriptLoaded, isLoading, renderButton } = useGoogleLogin(onCredential);

  useEffect(() => {
    if (isConfigured && isScriptLoaded) {
      renderButton(mountRef.current);
    }
  }, [isConfigured, isScriptLoaded, renderButton]);

  if (isLoading) {
    return (
      <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing in…
      </button>
    );
  }

  if (!isConfigured) {
    return (
      <div className="w-full">
        <button
          type="button"
          disabled
          title="Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID (frontend) and GOOGLE_CLIENT_ID (backend) to enable it."
          className="flex w-full items-center justify-center gap-3 rounded-sm border border-border bg-white px-4 py-3 text-sm font-medium text-slate-700 opacity-60 transition-colors"
        >
          <GoogleLogo />
          {label}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Google sign-in is not configured in this environment.</p>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full" />;
}

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
