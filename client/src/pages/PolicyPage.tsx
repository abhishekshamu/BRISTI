import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pageService } from '@/services/page.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageMeta } from '@/lib/seo';

const STATIC_CONTENT: Record<string, { title: string; eyebrow: string; description: string; sections: Array<{ heading: string; body: string }> }> = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Your trust',
    description: 'How BRISTI collects, uses and protects your personal information.',
    sections: [
      { heading: 'Information we collect', body: 'We collect information you provide directly — such as your name, email address, shipping address and payment details — as well as information gathered automatically, like device type, browser and browsing behaviour on our site.' },
      { heading: 'How we use your information', body: 'Your information is used to process orders, provide customer care, personalise your experience, and — only with your consent — to share collections and offers. We never sell your personal data.' },
      { heading: 'Payments', body: 'Payments are processed by trusted third-party providers (Stripe and Razorpay) using industry-standard encryption. Card details are never stored on our servers.' },
      { heading: 'Your rights', body: 'You may request access to, correction of, or deletion of your personal data at any time by contacting our concierge at hello@bristi.com. You may also opt out of marketing communications at any time.' },
      { heading: 'Contact', body: 'Questions about this policy? Write to our privacy team at hello@bristi.com — we respond within 24 hours.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    eyebrow: 'The agreement',
    description: 'The terms that govern your use of the BRISTI website and services.',
    sections: [
      { heading: 'Use of the site', body: 'By using the BRISTI website, you agree to these terms. The site and its content — designs, text, imagery and trademarks — are the property of BRISTI and may not be reproduced without written permission.' },
      { heading: 'Orders', body: 'All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order, including where prices or product details are incorrect.' },
      { heading: 'Pricing', body: 'Prices are displayed in the store currency and include applicable taxes unless stated otherwise. We make every effort to ensure accuracy but may correct pricing errors at any time.' },
      { heading: 'Intellectual property', body: 'The BRISTI name, logo, designs and all content on this site are protected by intellectual property laws. Copying or redistributing our content is prohibited.' },
      { heading: 'Limitation of liability', body: 'BRISTI is not liable for indirect or consequential losses arising from the use of this site or products purchased through it, to the extent permitted by law.' },
    ],
  },
  shipping: {
    title: 'Shipping & Delivery',
    eyebrow: 'To your door',
    description: 'Everything you need to know about how your BRISTI order reaches you.',
    sections: [
      { heading: 'Delivery times', body: 'Standard delivery takes 2–4 business days. Express delivery is available at checkout and takes 1–2 business days. International deliveries take 5–10 business days depending on destination.' },
      { heading: 'Complimentary shipping', body: 'Shipping is complimentary on all orders over $100. Orders below this threshold incur a flat shipping fee of $15, charged at checkout.' },
      { heading: 'Tracking', body: 'Once your order ships, a confirmation with tracking details is sent to your email. You can also track orders from your account dashboard.' },
      { heading: 'Signature packaging', body: 'Every order arrives in our signature BRISTI packaging — a keepsake box designed to be reused and kept.' },
    ],
  },
  refund: {
    title: 'Returns & Refunds',
    eyebrow: 'With ease',
    description: 'Our promise of effortless returns — 30 days, no questions asked.',
    sections: [
      { heading: 'The 30-day promise', body: 'We accept returns within 30 days of delivery. Items must be unworn, unwashed and returned with all original tags and packaging.' },
      { heading: 'How to return', body: 'Contact our concierge at hello@bristi.com to begin a return. A prepaid return label is provided for standard returns. Refunds are issued to the original payment method within 5–7 business days of receiving your return.' },
      { heading: 'Exchanges', body: 'Exchanges are treated as a return plus a new order, ensuring you receive your new size or piece as quickly as possible.' },
      { heading: 'Final sale items', body: 'Items marked "final sale" cannot be returned unless faulty. Please review product details carefully before purchase.' },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    eyebrow: 'Need help?',
    description: 'Answers to the questions we hear most often from our clients.',
    sections: [
      { heading: 'How do I find my size?', body: 'Every product page includes a detailed size guide. When in doubt, our concierge can help you choose the perfect fit — write to hello@bristi.com.' },
      { heading: 'Can I track my order?', body: 'Yes. Once your order ships you will receive tracking details by email, and you can follow progress from your account dashboard.' },
      { heading: 'Do you offer gift wrapping?', body: 'We do. Add a note at checkout and our atelier will wrap your pieces in our signature packaging, ready to gift.' },
      { heading: 'How do I care for my pieces?', body: 'Care instructions are printed on each garment label. As a rule, our pieces prefer gentle handling — cool water, mild detergent and air-drying.' },
      { heading: 'How can I contact the maison?', body: 'Our concierge is available seven days a week at hello@bristi.com or +1 (555) 123-4567.' },
    ],
  },
};

export default function PolicyPage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = paramSlug ?? location.pathname.replace(/^\//, '').split('/')[0] ?? 'privacy';
  const staticContent = STATIC_CONTENT[slug] ?? STATIC_CONTENT.privacy;

  usePageMeta({ title: `${staticContent.title} — BRISTI`, description: staticContent.description });

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', 'slug', slug],
    queryFn: () => pageService.getBySlug(slug),
    enabled: Boolean(slug),
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  return (
    <>
      <PageHeader
        eyebrow={staticContent.eyebrow}
        title={page?.title ?? staticContent.title}
        description={staticContent.description}
        breadcrumb={[{ label: staticContent.title }]}
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
            ) : page ? (
              <div className="prose-lux" dangerouslySetInnerHTML={{ __html: page.content }} />
            ) : (
              <div className="flex flex-col gap-10">
                {staticContent.sections.map((section) => (
                  <div key={section.heading}>
                    <h2 className="mb-4 font-display text-2xl font-medium">{section.heading}</h2>
                    <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{section.body}</p>
                  </div>
                ))}
                <div className="border-t border-border pt-8">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Last updated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}. Questions?
                    Write to <span className="text-accent">hello@bristi.com</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
