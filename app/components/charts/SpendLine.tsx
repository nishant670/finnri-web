"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatMoney } from "@/app/lib/format";

/** "₹650", "₹4.5k", "₹40k", "₹1.2L", "₹1.2Cr": axis labels that fit in 44px. */
export function shortRupees(value: number) {
    const amount = Math.abs(value);
    const trim = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));
    if (amount >= 1e7) return `₹${trim(amount / 1e7)}Cr`;
    if (amount >= 1e5) return `₹${trim(amount / 1e5)}L`;
    if (amount >= 1e3) return `₹${trim(amount / 1e3)}k`;
    return `₹${Math.round(amount)}`;
}

function niceCeiling(value: number) {
    if (value <= 0) return 1000;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => step * magnitude >= value)! * magnitude;
}

export interface SpendLineProps {
    /** Slots on the x axis: the days of the month for a month view, else the period's days. */
    axisDays: number;
    /** Running total for each day so far in this period. */
    current: number[];
    /** Running total for each day of the comparison period, when there is one. */
    previous: number[] | null;
    currentLabel: string;
    previousLabel: string;
    /** The date label for an axis slot, e.g. "2 Nov". */
    dayLabel: (index: number) => string;
    previousDayLabel: (index: number) => string;
}

/**
 * Spending so far this period as a running total, drawn over the whole
 * period's width with the comparison period behind it. On day 2 it is a short
 * line against last month's full curve, which says more than two bars.
 */
export default function SpendLine({ axisDays, current, previous, currentLabel, previousLabel, dayLabel, previousDayLabel }: SpendLineProps) {
    const [active, setActive] = useState<number | null>(null);
    const slots = Math.max(axisDays, current.length, previous?.length ?? 0, 2);
    const top = niceCeiling(Math.max(...current, ...(previous ?? []), 1));
    const x = (index: number) => (slots === 1 ? 0 : (index / (slots - 1)) * 100);
    const y = (value: number) => 100 - (value / top) * 100;
    const path = (values: number[]) => values.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
    const last = current.length - 1;
    const shown = active ?? last;

    const pick = (event: PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const index = Math.round(((event.clientX - box.left) / box.width) * (slots - 1));
        setActive(Math.max(0, Math.min(slots - 1, index)));
    };
    const step = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setActive((index) => Math.max(0, Math.min(slots - 1, (index ?? last) + (event.key === "ArrowRight" ? 1 : -1))));
    };

    const currentAt = shown <= last ? current[shown] : null;
    const previousAt = previous && shown < previous.length ? previous[shown] : null;
    const ticks = [top, top / 2, 0];
    const xLabels = [0, Math.round((slots - 1) / 2), slots - 1];

    return (
        <figure className="flex h-full min-h-[220px] flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <span className="flex items-center gap-2 font-semibold"><span className="h-[3px] w-4 rounded-full bg-[var(--series-gain)]" />{currentLabel}</span>
                {previous && <span className="flex items-center gap-2 font-semibold text-muted"><span className="w-4 border-t-2 border-dashed border-[var(--muted)]" />{previousLabel}</span>}
            </div>
            <div className="relative flex-1 pl-11">
                <div aria-hidden="true" className="absolute inset-0 pb-6">
                    <div className="relative h-full">
                        {ticks.map((tick, index) => (
                            <div key={tick} className="absolute left-0 right-0 flex items-center" style={{ top: `${index * 50}%` }}>
                                <span className="w-11 -translate-y-1/2 pr-2 text-right text-[11px] font-medium tabular-nums text-muted">{tick === 0 ? "₹0" : shortRupees(tick)}</span>
                                <span className="h-px flex-1 -translate-y-1/2 bg-border" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative h-full pb-6">
                    <div
                        className="relative h-full cursor-crosshair touch-none outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
                        tabIndex={0}
                        role="img"
                        aria-label={`${currentLabel}: ${formatMoney(Math.round(current[last] ?? 0))} by ${dayLabel(last)}${previous ? `. ${previousLabel}: ${formatMoney(Math.round(previous[Math.min(last, previous.length - 1)] ?? 0))} by the same day.` : ""}`}
                        onPointerMove={pick}
                        onPointerDown={pick}
                        onPointerLeave={() => setActive(null)}
                        onKeyDown={step}
                        onBlur={() => setActive(null)}
                    >
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                            <defs>
                                <linearGradient id="spend-fill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--series-gain)" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="var(--series-gain)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {previous && previous.length > 1 && <path d={path(previous)} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
                            {current.length > 0 && <path d={`${path(current)} L${x(last)},100 L0,100 Z`} fill="url(#spend-fill)" stroke="none" />}
                            {current.length > 1 && <path d={path(current)} fill="none" stroke="var(--series-gain)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />}
                        </svg>
                        <span aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-foreground/25" style={{ left: `${x(shown)}%`, opacity: active === null ? 0 : 1 }} />
                        {previousAt !== null && <span aria-hidden="true" className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-[var(--muted)]" style={{ left: `${x(shown)}%`, top: `${y(previousAt)}%` }} />}
                        {currentAt !== null && <span aria-hidden="true" className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-[var(--series-gain)]" style={{ left: `${x(shown)}%`, top: `${y(currentAt)}%` }} />}
                        {active !== null && (
                            <div role="status" className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-[13px] shadow-xl" style={{ left: `clamp(6rem, ${x(shown)}%, calc(100% - 6rem))` }}>
                                <p className="font-bold">Day {shown + 1}</p>
                                <p className="mt-1.5 flex justify-between gap-3"><span className="text-muted">{currentAt !== null ? dayLabel(shown) : "Not yet"}</span><span className="font-bold tabular-nums">{currentAt !== null ? formatMoney(Math.round(currentAt)) : "—"}</span></p>
                                {previous && <p className="mt-1 flex justify-between gap-3"><span className="text-muted">{previousAt !== null ? previousDayLabel(shown) : previousLabel}</span><span className="font-semibold tabular-nums">{previousAt !== null ? formatMoney(Math.round(previousAt)) : "—"}</span></p>}
                            </div>
                        )}
                    </div>
                    <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-5 text-[11px] font-medium text-muted">
                        {xLabels.map((index, position) => (
                            <span key={`${index}-${position}`} className="absolute top-1 whitespace-nowrap" style={{ left: `${x(index)}%`, transform: position === 0 ? "none" : position === 2 ? "translateX(-100%)" : "translateX(-50%)" }}>{dayLabel(index)}</span>
                        ))}
                    </div>
                </div>
            </div>
        </figure>
    );
}
