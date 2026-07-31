import type { ReactNode } from 'react';
import { PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; to?: string };
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-20 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <PackageSearch className="h-7 w-7" />}
      </div>
      <h3 className="font-display text-2xl font-medium tracking-wide">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {action &&
        (action.to ? (
          <Button asChild variant="outline" className="mt-2">
            <a href={action.to}>{action.label}</a>
          </Button>
        ) : (
          <Button variant="outline" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
