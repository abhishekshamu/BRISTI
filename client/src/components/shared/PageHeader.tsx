import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
  children,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={dark ? 'bg-[#0a0a0a] pt-32 pb-16 sm:pb-20' : 'bg-background pt-32 pb-12 sm:pb-16'}>
      <div className="container-lux flex flex-col gap-5">
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb
            items={[{ label: 'Home', to: '/' }, ...breadcrumb]}
            className={dark ? 'text-white/50' : undefined}
          />
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {eyebrow && <span className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">{eyebrow}</span>}
          <h1 className={`font-display text-4xl font-medium tracking-wide sm:text-5xl lg:text-6xl ${dark ? 'text-white' : 'text-foreground'}`}>
            {title}
          </h1>
          {description && (
            <p className={`max-w-2xl text-sm leading-7 sm:text-base sm:leading-8 ${dark ? 'text-white/60' : 'text-muted-foreground'}`}>
              {description}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
