import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { newsletterService } from '@/services/engagement.service';
import { isValidEmailAddress } from '@/lib/utils';

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
};

const LINK_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'New Arrivals', to: '/new-arrivals' },
      { label: 'Sale', to: '/sale' },
      { label: 'All Collections', to: '/collections' },
      { label: 'Shop All', to: '/shop' },
    ],
  },
  {
    title: 'Maison',
    links: [
      { label: 'About BRISTI', to: '/about' },
      { label: 'The Journal', to: '/journal' },
      { label: 'Contact', to: '/contact' },
      { label: 'Track Order', to: '/track-order' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Shipping & Delivery', to: '/shipping' },
      { label: 'Returns & Refunds', to: '/refund' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmailAddress(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubscribing(true);
    try {
      await newsletterService.subscribe({ email, source: 'footer' });
      toast.success('Welcome to BRISTI', { description: 'Check your inbox to confirm your subscription.' });
      setEmail('');
    } catch {
      toast.error('Could not subscribe right now. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-lux">
        <div className="grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-20">
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex flex-col leading-none">
              <span className="font-display text-3xl font-semibold tracking-[0.3em] text-foreground">BRISTI</span>
              <span className="mt-2 text-[10px] uppercase tracking-lux text-muted-foreground">Luxury redefined</span>
            </Link>
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">
              Timeless elegance, modern sophistication. A maison devoted to the art of dressing well.
            </p>
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
                className="flex h-12 items-center gap-2 bg-foreground px-5 text-[11px] font-medium uppercase tracking-lux-sm text-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              >
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
            <div className="flex items-center gap-3">
              {Object.entries(SOCIAL_ICONS).map(([platform, Icon]) => (
                <a
                  key={platform}
                  href={`https://${platform}.com/bristi`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={platform}
                  className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground transition-all hover:border-accent hover:text-accent"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-6 text-[11px] font-medium uppercase tracking-lux-sm text-foreground">{column.title}</h3>
              <ul className="space-y-3.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BRISTI. All rights reserved.</p>
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-lux-sm text-muted-foreground">
            Crafted with care <span className="text-accent">✦</span> Luxury redefined
          </p>
        </div>
      </div>
    </footer>
  );
}
