import { Skeleton } from '@/components/ui/skeleton';
import { HeroSkeleton } from '@/components/hero/HeroSkeleton';

// Premium loading screen for the homepage. Rendered only while the latest
// CMS/homepage configuration is being fetched — no section may mount before
// its data is ready, so no stale homepage or hero is ever visible.
export function HomeSkeleton() {
  return (
    <div className="bg-background" role="status" aria-busy="true" aria-label="Loading homepage">
      <HeroSkeleton />
      <section className="bg-secondary/40 pt-12 pb-12 sm:pb-20">
        <div className="container-lux">
          <div className="grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        </div>
      </section>
      <section className="bg-background pt-12 pb-12 sm:pb-20">
        <div className="container-lux">
          <Skeleton className="mb-10 h-6 w-52" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}