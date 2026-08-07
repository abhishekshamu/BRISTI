import { cn } from '@/lib/utils';

function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      className={cn('animate-spin text-current', className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export { Spinner };
