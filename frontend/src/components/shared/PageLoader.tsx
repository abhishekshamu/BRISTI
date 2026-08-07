import { Spinner } from '@/components/ui/spinner';

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background">
      <span className="font-display text-xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
      <Spinner size={22} className="text-accent" />
    </div>
  );
}
