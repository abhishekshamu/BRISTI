import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { pageService } from '@/services/page.service';
import { usePageMeta } from '@/lib/seo';
import { sanitizeRichText } from '@/lib/sanitize';
import { useBrandName } from '@/context/SettingsContext';

export default function AboutPage() {
  const brandName = useBrandName();
  const { data: cmsPage, isLoading } = useQuery({
    queryKey: ['page', 'slug', 'about'],
    queryFn: () => pageService.getBySlug('about'),
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  usePageMeta({
    title: cmsPage?.seo?.title ?? `About — ${brandName}`,
    description: cmsPage?.seo?.description,
  });

  return (
    <>
      <PageHeader
        eyebrow={cmsPage?.seo?.title ?? 'The Maison'}
        title={cmsPage?.title ?? 'About'}
        description={cmsPage?.excerpt ?? ''}
        breadcrumb={[{ label: 'About' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mx-auto max-w-3xl">
            {isLoading ? (
              <div className="flex flex-col gap-6">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : cmsPage ? (
              <div className="prose-lux" dangerouslySetInnerHTML={{ __html: sanitizeRichText(cmsPage.content) }} />
            ) : (
              <div className="border border-border p-10 text-center">
                <h2 className="font-display text-2xl font-medium">This page is not published yet</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The story of the maison is being written. Please check back soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
