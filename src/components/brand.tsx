import { cn } from "@/lib/cn";

/** Simple wordmark: a ringed "T" mark and the product name. */
export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-700" />
        <path d="M9 11h14M16 11v13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-brand-600" />
      </svg>
      {!compact && <span className="text-lg font-bold tracking-[0.2em] text-slate-700">TRACKLAB</span>}
    </span>
  );
}
