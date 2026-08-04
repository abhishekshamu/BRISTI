import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  align = 'center',
  className,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  link?: { label: string; to: string };
  align?: 'center' | 'left';
  className?: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={cn('flex flex-col gap-4', align === 'center' ? 'items-center text-center' : 'items-start text-left', className)}
    >
      {eyebrow && (
        <span className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-lux-sm text-accent">
          <span className={cn('h-px w-8 bg-accent', align === 'center' && 'order-first')} />
          {eyebrow}
          {align === 'center' && <span className="h-px w-8 bg-accent" />}
        </span>
      )}
      <h2 className={cn('font-display text-3xl font-medium tracking-wide sm:text-4xl lg:text-5xl', dark ? 'text-[var(--on-ink)]' : 'text-foreground')}>
        {title}
      </h2>
      {description && (
        <p className={cn('max-w-xl text-sm leading-7 sm:text-base', dark ? 'text-[var(--on-ink-dim)]' : 'text-muted-foreground')}>{description}</p>
      )}
      {link && (
        <Link
          to={link.to}
          className={cn(
            'group mt-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-lux-sm transition-colors',
            dark ? 'text-[var(--on-ink)] hover:text-accent' : 'text-foreground hover:text-accent',
          )}
        >
          {link.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </motion.div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('py-16 sm:py-24', className)}>{children}</section>;
}
