import { useLocation, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pageService } from '@/services/page.service';
import { faqService } from '@/services/faq.service';
import type { FAQ } from '@shared/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageMeta, useJsonLd } from '@/lib/seo';
import { sanitizeRichText } from '@/lib/sanitize';
import { useBrandName } from '@/context/SettingsContext';

const SLUG_TITLES: Record<string, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  shipping: 'Shipping & Delivery',
  refund: 'Returns & Refunds',
  faq: 'Frequently Asked Questions',
};

export default function PolicyPage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = paramSlug ?? location.pathname.replace(/^\//, '').split('/')[0] ?? 'privacy';
  const brandName = useBrandName();

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', 'slug', slug],
    queryFn: () => pageService.getBySlug(slug),
    enabled: Boolean(slug) && slug !== 'faq',
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  usePageMeta({ title: `${SLUG_TITLES[slug] ?? slug} — ${brandName}`, description: page?.seo?.description });

  const { data: faqs, isLoading: faqsLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: faqService.list,
    enabled: slug === 'faq',
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  const faqCategories = useMemo(() => {
    if (!faqs?.length) return [];
    const groups = new Map<string, FAQ[]>();
    for (const faq of faqs) {
      if (faq.isActive === false) continue;
      const key = faq.category || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(faq);
    }
    return Array.from(groups.entries());
  }, [faqs]);

  useJsonLd(
    slug === 'faq' && faqCategories.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqCategories
            .flatMap(([, items]) => items)
            .map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
        }
      : []
  );

  const isFaq = slug === 'faq';
  const showFaqs = isFaq && !page && faqCategories.length > 0;
  const title = page?.title ?? SLUG_TITLES[slug] ?? 'Page';

  return (
    <>
      <PageHeader
        eyebrow={page?.seo?.title ?? 'From the maison'}
        title={title}
        description={page?.seo?.description ?? ''}
        breadcrumb={[{ label: title }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mx-auto max-w-3xl">
            {isFaq ? faqsLoading : isLoading ? (
              <div className="flex flex-col gap-6">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : page ? (
              <div className="flex flex-col gap-10">
                <div className="prose-lux" dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.content) }} />
                {isFaq && faqCategories.length > 0 && (
                  <div className="flex flex-col gap-10">
                    {faqCategories.map(([category, items]) => (
                      <div key={category}>
                        <h2 className="mb-4 font-display text-2xl font-medium">{category}</h2>
                        <div className="flex flex-col gap-6">
                          {items.map((faq) => (
                            <div key={String(faq._id)}>
                              <h3 className="mb-2 font-display text-lg font-medium">{faq.question}</h3>
                              <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{faq.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : showFaqs ? (
              <div className="flex flex-col gap-10">
                {faqCategories.map(([category, items]) => (
                  <div key={category}>
                    <h2 className="mb-4 font-display text-2xl font-medium">{category}</h2>
                    <div className="flex flex-col gap-6">
                      {items.map((faq) => (
                        <div key={String(faq._id)}>
                          <h3 className="mb-2 font-display text-lg font-medium">{faq.question}</h3>
                          <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-border p-10 text-center">
                <h2 className="font-display text-2xl font-medium">This page is not published yet</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Please check back soon — this page has not been published yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
