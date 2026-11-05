import { cn } from "@/app/lib/utils";

export default function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-track", className)} />;
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
    return <div className="space-y-6" role="status" aria-label="Loading content"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /><div className="space-y-3 rounded-2xl border border-border bg-card p-5">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-14" />)}</div><span className="sr-only">Loading…</span></div>;
}
