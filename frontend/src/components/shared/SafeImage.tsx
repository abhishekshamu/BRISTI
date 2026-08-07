import { useState, type ImgHTMLAttributes } from 'react';
import { getImageUrl, cn } from '@/lib/utils';
import { useBrandName } from '@/context/SettingsContext';

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallbackClassName?: string;
  placeholder?: string;
}

/**
 * Image wrapper that falls back to a branded placeholder tile when the
 * source is missing or fails to load (broken CDN/upload URLs).
 */
export function SafeImage({ src, alt, className, fallbackClassName, placeholder, ...rest }: SafeImageProps) {
  const brandName = useBrandName();
  const [failed, setFailed] = useState(false);
  const resolved = src ? getImageUrl(src) : null;

  if (!resolved || failed) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center bg-secondary text-muted-foreground', fallbackClassName)}>
        <span className="font-display tracking-wide">{placeholder ?? brandName}</span>
      </div>
    );
  }

  return <img src={resolved} alt={alt} loading={rest.loading ?? 'lazy'} onError={() => setFailed(true)} {...rest} className={className} />;
}