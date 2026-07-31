import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePageMeta } from '@/lib/seo';

export default function TrackOrderPage() {
  usePageMeta({ title: 'Track Order — BRISTI', description: 'Follow your BRISTI order from atelier to your door.' });
  const { isAuthenticated } = useAuth();

  return (
    <>
      <PageHeader
        eyebrow="Follow your pieces"
        title="Track Your Order"
        description="From atelier to your door — every BRISTI order is traceable."
        breadcrumb={[{ label: 'Track Order' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mx-auto max-w-xl border border-border p-10 text-center">
            {isAuthenticated ? (
              <div className="flex flex-col items-center gap-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <PackageSearch className="h-6 w-6" />
                </span>
                <h2 className="font-display text-2xl font-medium">Your orders, all in one place</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  Track the status of every order from your account — including shipping updates the moment your pieces leave the atelier.
                </p>
                <Link to="/account/orders" className="btn-lux-gold mt-2">
                  View my orders
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <PackageSearch className="h-6 w-6" />
                </span>
                <h2 className="font-display text-2xl font-medium">Sign in to track your order</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  Order tracking is available in your account. If you ordered as a guest, check your email — every shipment includes live tracking details.
                </p>
                <div className="mt-2 flex gap-3">
                  <Link to="/login?redirect=/account/orders" className="btn-lux-primary">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn-lux-outline">
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
