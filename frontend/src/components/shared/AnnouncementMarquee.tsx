import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { siteService } from '@/services/site.service';

export function AnnouncementMarquee({ className }: { className?: string }) {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: siteService.getSettings,
    staleTime: 1000 * 60 * 5,
  });

  const enabled = settings?.announcement?.enabled ?? false;
  const messages = settings?.announcement?.messages?.filter(Boolean) ?? [];

  if (!enabled || messages.length === 0) return null;

  const items = [...messages, ...messages];
  return (
    <div className={cn('relative overflow-hidden bg-[var(--announcement-background)] py-1.5 text-[var(--announcement-text)]', className)}>
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
        {items.map((message, index) => (
          <span key={index} className="flex items-center gap-12 text-[9px] font-medium uppercase tracking-lux-sm">
            {message}
            <span className="text-[var(--announcement-accent)]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
