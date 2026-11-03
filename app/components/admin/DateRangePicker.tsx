"use client";

import { CalendarRange } from "lucide-react";

/** Two dates in one pill, matching the dashboard's period picker. */
export default function DateRangePicker({
    start,
    end,
    onChange,
}: {
    start: string;
    end: string;
    onChange: (range: { start: string; end: string }) => void;
}) {
    const input = "h-8 rounded-full bg-transparent px-2 text-sm font-semibold outline-none focus-visible:ring-4 focus-visible:ring-accent/20";
    return (
        <div className="inline-flex h-10 flex-wrap items-center gap-1 rounded-full border border-border bg-card pl-3.5 pr-1.5">
            <CalendarRange className="h-4 w-4 text-accent" aria-hidden="true" />
            <label>
                <span className="sr-only">Start date</span>
                <input type="date" value={start} max={end} onChange={(event) => onChange({ start: event.target.value, end })} className={input} />
            </label>
            <span className="text-muted" aria-hidden="true">–</span>
            <label>
                <span className="sr-only">End date</span>
                <input type="date" value={end} min={start} onChange={(event) => onChange({ start, end: event.target.value })} className={input} />
            </label>
        </div>
    );
}
