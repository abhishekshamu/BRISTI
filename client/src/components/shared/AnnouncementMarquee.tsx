import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { siteService } from '@/services/site.service';

const DEFAULT_MESSAGES = [
  'Complimentary shipping on orders over $100',
  'New season, new silhouettes',
  'Luxury redefined',
  'Free returns within 30 days',
];

export function AnnouncementMarquee({ className }: { className?: string }) {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: siteService.getSettings,
    staleTime: 1000 * 60 * 5,
  });

  const enabled = settings?.announcement?.enabled ?? true;
  const messages = settings?.announcement?.messages?.length ? settings.announcement.messages : DEFAULT_MESSAGES;

  if (!enabled) return null;

  const items = [...messages, ...messages];
  return (
    <div className={cn('relative overflow-hidden bg-foreground py-1.5 text-background', className)}>
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
        {items.map((message, index) => (
          <span key={index} className="flex items-center gap-12 text-[9px] font-medium uppercase tracking-lux-sm">
            {message}
            <span className="text-accent">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
