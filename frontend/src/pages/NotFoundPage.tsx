import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePageMeta } from '@/lib/seo';

export default function NotFoundPage() {
  usePageMeta({ title: 'Page Not Found — BRISTI' });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-display text-[7rem] font-semibold leading-none text-transparent sm:text-[10rem]"
        style={{ WebkitTextStroke: '1px hsl(var(--foreground) / 0.25)' }}
      >
        404
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="text-[11px] font-medium uppercase tracking-lux text-accent">This page has left the maison</p>
        <h1 className="font-display text-3xl font-medium">The piece you're looking for isn't here</h1>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          The page may have moved, or the link may be outdated. Explore the collection instead — the atelier has plenty to offer.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/" className="btn-lux-primary">Back to home</Link>
          <Link to="/shop" className="btn-lux-outline">Shop the collection</Link>
        </div>
      </motion.div>
    </div>
  );
}
