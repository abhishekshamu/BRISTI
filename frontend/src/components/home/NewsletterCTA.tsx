import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { newsletterService } from '@/services/engagement.service';
import { isValidEmailAddress } from '@/lib/utils';

interface NewsletterCTAProps {
  props?: {
    eyebrow?: string;
    title?: string;
    description?: string;
    placeholder?: string;
    buttonText?: string;
    footerText?: string;
  };
}

export function NewsletterCTA({ props }: NewsletterCTAProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Newsletter section is CMS-configured; nothing is rendered without it.
  if (!props?.title) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmailAddress(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await newsletterService.subscribe({ email, source: 'newsletter-section' });
      toast.success('Welcome to the maison', { description: 'Your invitation to the world of BRISTI is on its way.' });
      setEmail('');
    } catch {
      toast.error('Could not subscribe right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[var(--ink)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--glow-newsletter),transparent_55%)]" aria-hidden="true" />
      <div className="container-lux relative py-16 text-center sm:py-20">
        <span className="mb-6 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux text-accent">
          <span className="h-px w-8 bg-accent" /> {props?.eyebrow || 'Private list'} <span className="h-px w-8 bg-accent" />
        </span>
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium leading-tight text-[var(--on-ink)] sm:text-5xl">
          {props?.title || <>First access. Private previews. <em className="text-gradient-gold not-italic">Always.</em></>}
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[var(--on-ink-dim)]">
          {props?.description || 'Join the BRISTI list for early access to collections, atelier stories and invitations only members receive.'}
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-md items-stretch">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={props?.placeholder || 'Your email address'}
            aria-label="Email address"
            className="flex-1 border border-[var(--on-ink)]/20 bg-[var(--on-ink)]/5 px-5 py-4 text-sm text-[var(--on-ink)] outline-none transition-colors placeholder:text-[var(--on-ink)]/40 focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent px-7 text-[11px] font-medium uppercase tracking-lux-sm text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {props?.buttonText && <span className="hidden sm:inline">{props.buttonText}</span>}
          </button>
        </form>
        <p className="mt-4 text-[11px] uppercase tracking-lux-sm text-[var(--on-ink-muted)]">{props?.footerText || 'Unsubscribe at any time. No noise, only elegance.'}</p>
      </div>
    </section>
  );
}
