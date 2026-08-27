import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function StatTile({ label, value, hint, delta }: { label: string; value: string | number; hint?: string; delta?: number }) {
    const positive = (delta || 0) >= 0;
    return <article className="rounded-panel border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>{delta !== undefined && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${positive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"}`}>{positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(delta).toFixed(1)}%</span>}</div><p className="mt-4 text-3xl font-bold tracking-tight font-rounded">{value}</p>{hint && <p className="mt-2 text-xs leading-5 text-text-muted">{hint}</p>}</article>;
}
