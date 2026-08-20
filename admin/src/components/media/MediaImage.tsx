import { useCallback, useEffect, useState } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/mediaUrl';

interface MediaImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** Shown inside the placeholder when the image fails to load. */
  fallbackLabel?: string;
  /** Show a retry button inside the fallback placeholder. */
  retry?: boolean;
  /** Optional onRetry callback (e.g. trigger a server-side repair). */
  onRetry?: () => void;
}

/**
 * <img> wrapper that resolves stored media URLs against the API origin and
 * renders a clean placeholder (with optional retry) instead of the browser's
 * broken-image icon when a URL 404s or the network fails.
 */
export default function MediaImage({
  src,
  alt = '',
  className,
  loading = 'lazy',
  fallbackLabel,
  retry = false,
  onRetry,
}: MediaImageProps) {
  const resolved = resolveMediaUrl(src);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [resolved]);

  const handleRetry = useCallback(() => {
    setFailed(false);
    setAttempt((a) => a + 1);
    onRetry?.();
  }, [onRetry]);

  if (!resolved) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 ${className ?? ''}`}>
        <ImageOff className="w-5 h-5 shrink-0" />
        {fallbackLabel && <span className="text-[10px] px-2 text-center truncate max-w-full">{fallbackLabel}</span>}
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 ${className ?? ''}`}>
        <ImageOff className="w-5 h-5 shrink-0" />
        <span className="text-[10px] px-2 text-center truncate max-w-full">{fallbackLabel || 'Image unavailable'}</span>
        {retry && (
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      key={attempt}
      src={resolved}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  );
}