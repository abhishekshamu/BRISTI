import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { newsletterService } from '@/services/engagement.service';
import { useSiteSettings } from '@/context/SettingsContext';
import { isValidEmailAddress } from '@/lib/utils';

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
};

export function Footer() {
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const brandName = settings?.brandName || 'BRISTI';
  const tagline = settings?.slogan;
  const showLogoImage = !!settings?.logo && settings.logo !== '/logo.png' && settings.logo !== '/favicon.svg';

  const linkColumns: Array<{ title: string; links: Array<{ label: string; to: string }>; content?: string }> = settings?.footer?.sections?.length
    ? settings.footer.sections
        .filter((section) => section.isActive !== false && (section.links?.length || section.content))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((section) => ({
          title: section.title || section.type,
          links: (section.links || []).map((link) => ({ label: link.label, to: link.url })),
          content: section.content,
        }))
    : [];

  const socialLinks = (settings?.socialLinks ?? []).filter((link) => link.url && SOCIAL_ICONS[link.platform]);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmailAddress(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubscribing(true);
    try {
      await newsletterService.subscribe({ email, source: 'footer' });
      toast.success(`Welcome to ${brandName}`, { description: 'Check your inbox to confirm your subscription.' });
      setEmail('');
    } catch {
      toast.error('Could not subscribe right now. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="border-t border-[var(--footer-border)] bg-[var(--footer-background)]">
      <div className="container-lux">
        <div className="grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-20">
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex flex-col leading-none">
              {showLogoImage ? (
                <img src={settings?.logo} alt={brandName} className="h-10 w-auto object-contain" />
              ) : (
                <span className="font-display text-3xl font-semibold tracking-[0.3em] text-[var(--footer-heading)]">{brandName}</span>
              )}
              {tagline && (
                <span className="mt-2 text-[10px] uppercase tracking-lux text-[var(--footer-text)]">{tagline}</span>
              )}
            </Link>
            {settings?.contactInfo?.address && (
              <p className="max-w-xs text-sm leading-7 text-[var(--footer-text)]">{settings.contactInfo.address}</p>
            )}
            <form onSubmit={handleSubscribe} className="mt-2 flex max-w-sm items-stretch">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="h-12 flex-1 border border-input bg-transparent px-4 text-sm outline-none transition-colors focus:border-accent placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                disabled={subscribing}
                aria-label="Subscribe to newsletter"
                className="flex h-12 items-center gap-2 bg-[var(--footer-heading)] px-5 text-[11px] font-medium uppercase tracking-lux-sm text-[var(--footer-background)] transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              >
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map(({ platform, url }) => {
                  const Icon = SOCIAL_ICONS[platform];
                  if (!Icon) return null;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={platform}
                      className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground transition-all hover:border-accent hover:text-accent"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {linkColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-6 text-[11px] font-medium uppercase tracking-lux-sm text-[var(--footer-heading)]">{column.title}</h3>
              <ul className="space-y-3.5">
                {(column.links?.length ? column.links : [{ label: column.content || '', to: '#' }]).map((link) => (
                  <li key={link.label}>
                    {link.to === '#' ? (
                      <span className="text-sm text-[var(--footer-link)]">{link.label}</span>
                    ) : (
                      <Link to={link.to} className="text-sm text-[var(--footer-link)] transition-colors hover:text-[var(--footer-link-hover)]">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--footer-border)] py-8 sm:flex-row">
          <p className="text-xs text-[var(--footer-text)]">© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-lux-sm text-[var(--footer-text)]">
            Crafted with care <span className="text-accent">✦</span> {tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
