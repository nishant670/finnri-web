import { Change } from "@/app/components/dashboard/kit";

/** One headline figure, styled like the dashboard's figures. `delta` is a percent change. */
export default function StatTile({ label, value, hint, delta }: { label: string; value: string | number; hint?: string; delta?: number }) {
    return (
        <article className="min-w-0 rounded-2xl border border-border bg-card px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="truncate text-[13px] font-semibold text-muted">{label}</p>
            <p className="mt-0.5 truncate text-[22px] font-bold leading-8 tabular-nums sm:text-[26px] sm:leading-9">{value}</p>
            <div className="flex min-h-5 flex-wrap items-center gap-x-2 text-[13px] leading-5 text-muted">
                {delta !== undefined ? <Change value={delta} goodWhen="up" /> : null}
                {hint ? <span>{hint}</span> : null}
            </div>
        </article>
    );
}
