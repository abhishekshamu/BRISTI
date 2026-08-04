import { Skeleton } from '@/components/ui/skeleton';

// Mirrors the active CMS hero geometry (`.hx-hero`) so the placeholder never
// shifts the layout. Shown ONLY while the latest hero data is loading — the
// hero itself is never rendered with defaults or stale state.
export function HeroSkeleton() {
  return (
    <div
      className="relative h-[70vh] w-[min(100%,1320px)] overflow-hidden bg-[var(--ink, #0a0a0a)] lg:h-[72vh]"
      style={{ marginTop: 'calc(var(--header-height, 80px) + 0.75rem + 14.4px)' }}
      role="status"
      aria-busy="true"
      aria-label="Loading hero"
    >
      <div className="absolute inset-x-5 inset-y-0 flex items-center gap-4 overflow-hidden">
        <Skeleton className="h-[72%] w-full max-w-[420px] sm:w-1/3" />
        <Skeleton className="hidden h-[72%] w-1/3 max-w-[420px] lg:block" />
      </div>
    </div>
  );
}