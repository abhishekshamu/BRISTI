import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

function getPageItems(page: number, pages: number): Array<number | '…'> {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const items: Array<number | '…'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push('…');
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < pages - 1) items.push('…');
  items.push(pages);
  return items;
}

function Pagination({ className, page, pages, onPageChange, ...props }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1 py-10', className)}
      {...props}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-9 items-center gap-1 border border-border px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center">
        {getPageItems(page, pages).map((item, index) =>
          item === '…' ? (
            <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground" aria-hidden="true">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                'flex h-9 w-9 items-center justify-center border border-border text-xs font-medium transition-colors',
                item === page ? 'bg-foreground text-background' : 'text-muted-foreground hover:border-accent hover:text-accent',
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-9 items-center gap-1 border border-border px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}

export { Pagination };
