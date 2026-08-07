import { useState } from 'react';
import { MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { contactService } from '@/services/contact.service';
import { siteService } from '@/services/site.service';
import { pageService } from '@/services/page.service';
import { usePageMeta } from '@/lib/seo';
import { sanitizeRichText } from '@/lib/sanitize';
import { isValidEmailAddress } from '@/lib/utils';

export default function ContactPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: siteService.getSettings,
  });

  const { data: cmsPage } = useQuery({
    queryKey: ['page', 'slug', 'contact'],
    queryFn: () => pageService.getBySlug('contact'),
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  usePageMeta({
    title: cmsPage?.seo?.title ?? `Contact — ${settings?.brandName ?? 'BRISTI'}`,
    description: cmsPage?.seo?.description ?? '',
  });

  const contact = settings?.contactInfo;
  const email = contact?.email ?? '';
  const addressLines = (contact?.address ?? '').split(',').map((line) => line.trim()).filter(Boolean);

  const CONTACT_INFO = [
    ...(addressLines.length ? [{ icon: MapPin, title: 'The Maison', lines: addressLines }] : []),
    ...(contact?.phone ? [{ icon: Phone, title: 'Concierge', lines: [contact.phone] }] : []),
    ...(email ? [{ icon: Mail, title: 'Email', lines: [email] }] : []),
  ];

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Please fill in your name and message');
      return;
    }
    if (!isValidEmailAddress(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      await contactService.send({ ...form, subject: form.subject || 'General enquiry' });
      toast.success('Message sent', { description: 'We will be in touch within 24 hours.' });
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error('Could not send your message right now', { description: email ? `Please try again, or email us directly at ${email}.` : 'Please try again in a moment.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={cmsPage?.title ?? 'Contact'}
        description={cmsPage?.excerpt}
        breadcrumb={[{ label: 'Contact' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
            {cmsPage ? (
              <div className="prose-lux prose-lux-card" dangerouslySetInnerHTML={{ __html: sanitizeRichText(cmsPage.content) }} />
            ) : (
              <div className="flex flex-col gap-6">
                {CONTACT_INFO.map(({ icon: Icon, title, lines }) => (
                  <div key={title} className="flex gap-5 border border-border p-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-accent/40 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-lux-sm">{title}</h3>
                      {lines.map((line) => (
                        <p key={line} className="text-sm leading-6 text-muted-foreground">{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 border border-border p-8 sm:p-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-name">Full name *</Label>
                  <Input id="contact-name" value={form.name} onChange={setField('name')} placeholder="Jane Doe" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input id="contact-email" type="email" value={form.email} onChange={setField('email')} placeholder="jane@example.com" />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-phone">Phone (optional)</Label>
                  <Input id="contact-phone" type="tel" value={form.phone} onChange={setField('phone')} placeholder="Phone number" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-subject">Subject *</Label>
                  <Input id="contact-subject" value={form.subject} onChange={setField('subject')} placeholder="Order, tailoring, appointment…" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea id="contact-message" value={form.message} onChange={setField('message')} className="min-h-44" placeholder="How may we assist you?" />
              </div>
              <Button type="submit" variant="dark" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send message
              </Button>
              {email && (
                <p className="text-center text-[10px] uppercase tracking-lux-sm text-muted-foreground">
                  Prefer email? Write to {email} directly
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
