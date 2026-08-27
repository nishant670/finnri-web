"use client";

import { CalendarRange } from "lucide-react";

export default function DateRangePicker({
    start,
    end,
    onChange,
}: {
    start: string;
    end: string;
    onChange: (range: { start: string; end: string }) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 text-xs font-semibold text-text-muted">
            <CalendarRange className="ml-2 h-4 w-4 text-accent" />
            <label>
                <span className="sr-only">Start date</span>
                <input
                    type="date"
                    value={start}
                    max={end}
                    onChange={(event) => onChange({ start: event.target.value, end })}
                    className="rounded-xl bg-transparent px-2 py-2 outline-none"
                />
            </label>
            <span>to</span>
            <label>
                <span className="sr-only">End date</span>
                <input
                    type="date"
                    value={end}
                    min={start}
                    onChange={(event) => onChange({ start, end: event.target.value })}
                    className="rounded-xl bg-transparent px-2 py-2 outline-none"
                />
            </label>
        </div>
    );
}
