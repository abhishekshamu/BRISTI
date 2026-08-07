export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`admin-skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 6, cols = 5, className = '' }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? 'h-4 w-1/4' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}
