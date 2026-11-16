import { AlertTriangle, Check, Inbox, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Spinner({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-10 text-sm text-slate-500", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, traceId, onRetry }: { message: string; traceId?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-12 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
      <p className="font-medium text-slate-700">Couldn&apos;t load the data</p>
      <p className="max-w-md text-sm text-slate-500">{message}</p>
      {traceId && <p className="font-mono text-xs text-slate-400">Reference: {traceId}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** ✓ / ✗ for boolean columns, with text for screen readers. */
export function BoolIcon({ value, label }: { value: boolean | null | undefined; label?: string }) {
  return value ? (
    <span className="inline-flex text-brand-600" title={label ? `${label}: yes` : "Yes"}>
      <Check className="h-4 w-4" aria-hidden />
      <span className="sr-only">Yes</span>
    </span>
  ) : (
    <span className="inline-flex text-red-500" title={label ? `${label}: no` : "No"}>
      <X className="h-4 w-4" aria-hidden />
      <span className="sr-only">No</span>
    </span>
  );
}

const badgeTones = {
  green: "bg-brand-50 text-brand-700 ring-brand-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function Badge({ tone = "slate", children, className }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", badgeTones[tone], className)}>
      {children}
    </span>
  );
}
