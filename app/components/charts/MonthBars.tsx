"use client";

import { useState } from "react";
import { formatMoney } from "@/app/lib/format";
import { shortRupees } from "@/app/components/charts/SpendLine";
import { cn } from "@/app/lib/utils";

export interface MonthBar { month: string; spent: number; received: number; selected: boolean }

const monthName = new Intl.DateTimeFormat("en-IN", { month: "short" });
const monthLong = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const asDate = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(y, m - 1, 1); };

function niceCeiling(value: number) {
    if (value <= 0) return 1000;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => step * magnitude >= value)! * magnitude;
}

/**
 * Twelve months of money in (blue) and out (coral), side by side. The months
 * inside the chosen period are full strength; the rest are context.
 */
export default function MonthBars({ data }: { data: MonthBar[] }) {
    const [active, setActive] = useState<number | null>(null);
    const top = niceCeiling(Math.max(...data.map((bar) => Math.max(bar.spent, bar.received)), 1));
    const shown = active === null ? null : data[active];
    const anySelected = data.some((bar) => bar.selected);

    return (
        <figure>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--series-gain)]" />Spent</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--series-base)]" />Received</span>
            </div>
            <div className="relative pl-11">
                <div aria-hidden="true" className="absolute inset-y-0 left-0 right-0">
                    {[top, top / 2, 0].map((tick, index) => (
                        <div key={tick} className="absolute left-0 right-0 flex items-center" style={{ top: `${index * 50}%` }}>
                            <span className="w-11 -translate-y-1/2 pr-2 text-right text-[11px] font-medium tabular-nums text-muted">{tick === 0 ? "₹0" : shortRupees(tick)}</span>
                            <span className="h-px flex-1 -translate-y-1/2 bg-border" />
                        </div>
                    ))}
                </div>
                <div className="relative flex h-52 items-end gap-1 sm:h-60 sm:gap-2" onMouseLeave={() => setActive(null)}>
                    {data.map((bar, index) => (
                        <button
                            key={bar.month}
                            type="button"
                            onMouseEnter={() => setActive(index)}
                            onFocus={() => setActive(index)}
                            onBlur={() => setActive(null)}
                            aria-label={`${monthLong.format(asDate(bar.month))}: spent ${formatMoney(Math.round(bar.spent))}, received ${formatMoney(Math.round(bar.received))}`}
                            className={cn("flex h-full min-w-0 flex-1 cursor-default items-end justify-center gap-[2px] transition-opacity", anySelected && !bar.selected && "opacity-40", active !== null && active !== index && "opacity-40")}
                        >
                            <span className="w-full max-w-4 rounded-t-[4px] bg-[var(--series-gain)]" style={{ height: `${(bar.spent / top) * 100}%`, minHeight: bar.spent > 0 ? 2 : 0 }} />
                            <span className="w-full max-w-4 rounded-t-[4px] bg-[var(--series-base)]" style={{ height: `${(bar.received / top) * 100}%`, minHeight: bar.received > 0 ? 2 : 0 }} />
                        </button>
                    ))}
                    {shown && (
                        <div role="status" className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-[13px] shadow-xl" style={{ left: `clamp(6rem, ${((active! + 0.5) / data.length) * 100}%, calc(100% - 6rem))` }}>
                            <p className="font-bold">{monthLong.format(asDate(shown.month))}</p>
                            <p className="mt-1.5 flex justify-between gap-3"><span className="text-muted">Spent</span><span className="font-bold tabular-nums">{formatMoney(Math.round(shown.spent))}</span></p>
                            <p className="mt-1 flex justify-between gap-3"><span className="text-muted">Received</span><span className="font-bold tabular-nums">{formatMoney(Math.round(shown.received))}</span></p>
                            <p className="mt-1.5 flex justify-between gap-3 border-t border-border pt-1.5"><span className="text-muted">Net</span><span className={cn("font-bold tabular-nums", shown.received - shown.spent < 0 ? "text-negative" : "text-positive")}>{shown.received - shown.spent < 0 ? "−" : "+"}{formatMoney(Math.abs(Math.round(shown.received - shown.spent)))}</span></p>
                        </div>
                    )}
                </div>
            </div>
            <div aria-hidden="true" className="mt-2 flex gap-1 pl-11 sm:gap-2">
                {data.map((bar, index) => (
                    <span key={bar.month} className={cn("min-w-0 flex-1 text-center text-[11px] font-medium", bar.selected ? "font-bold text-foreground" : "text-muted")}>
                        {data.length > 8 && index % 2 === 1 && !bar.selected ? <span className="hidden sm:inline">{monthName.format(asDate(bar.month))}</span> : monthName.format(asDate(bar.month))}
                    </span>
                ))}
            </div>
            <figcaption className="sr-only">Money spent and received in each of the last {data.length} months.</figcaption>
        </figure>
    );
}
