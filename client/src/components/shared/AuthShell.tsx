import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-24 pt-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Link to="/" className="font-display text-3xl font-semibold tracking-[0.3em] text-foreground">
            BRISTI
          </Link>
          <span className="text-[10px] uppercase tracking-lux text-muted-foreground">Luxury redefined</span>
          <span className="mt-6 h-px w-12 bg-accent" />
          <h1 className="mt-2 font-display text-3xl font-medium">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="border border-border bg-card p-8 sm:p-10">{children}</div>
      </motion.div>
    </div>
  );
}
