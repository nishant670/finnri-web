"use client";

import { useState } from "react";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";

export interface YearBar { year: number; base: number; gain: number }

/** A round number at or above `value`, so the axis reads 10 L, 20 L, 30 L. */
function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => candidate * magnitude >= value)!;
  return step * magnitude;
}

const axisLabel = (value: number) => (value === 0 ? "0" : formatLakhCrore(value).replace(" lakh", " L").replace(" crore", " Cr"));

/**
 * Stacked bars, one per year: the blue part is what you put in, the coral part
 * what it earned or cost. Hovering or focusing a bar shows its numbers; the
 * yearly table beside it is the full, non-visual view.
 */
export default function YearBars({
  data,
  baseLabel,
  gainLabel,
  totalLabel,
  caption,
}: {
  data: YearBar[];
  baseLabel: string;
  gainLabel: string;
  /** What base + gain means, e.g. "Value"; null when the sum isn't meaningful. */
  totalLabel: string | null;
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const top = niceCeiling(Math.max(...data.map((bar) => bar.base + bar.gain), 1));
  const ticks = [top, top / 2, 0];
  const shown = active === null ? null : data[active];
  // About six year labels on round years (Y5, Y10…); the final year gets one
  // too unless it would crowd the last round one.
  const labelEvery = [1, 2, 5, 10].find((step) => data.length / step <= 7) ?? 10;
  const labelled = (index: number) => {
    const year = data[index].year;
    if (year % labelEvery === 0 || labelEvery === 1) return true;
    return index === data.length - 1 && year % labelEvery >= labelEvery / 2;
  };

  return (
    <figure>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-medium"><span className="h-3 w-3 rounded-[4px]" style={{ background: "var(--series-base)" }} />{baseLabel}</span>
        <span className="flex items-center gap-2 font-medium"><span className="h-3 w-3 rounded-[4px]" style={{ background: "var(--series-gain)" }} />{gainLabel}</span>
      </div>
      <div className="relative pl-12">
        {/* Grid and axis labels */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 right-0">
          {ticks.map((tick, index) => (
            <div key={tick} className="absolute left-0 right-0 flex items-center" style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}>
              <span className="w-12 -translate-y-1/2 pr-2 text-right text-[11px] font-medium tabular-nums text-muted">{axisLabel(tick)}</span>
              <span className={cn("h-px flex-1 -translate-y-1/2", tick === 0 ? "bg-border" : "border-t border-dashed border-border")} />
            </div>
          ))}
        </div>

        <div className="relative flex h-56 items-end gap-[3px] sm:h-64" onMouseLeave={() => setActive(null)}>
          {data.map((bar, index) => {
            const total = bar.base + bar.gain;
            return (
              <button
                key={bar.year}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                aria-label={`Year ${bar.year}: ${baseLabel} ${formatMoney(Math.round(bar.base))}, ${gainLabel} ${formatMoney(Math.round(bar.gain))}`}
                className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              >
                <span
                  className={cn("flex w-full flex-col justify-end gap-[2px] transition-opacity duration-200", active !== null && active !== index && "opacity-45")}
                  style={{ height: `${(total / top) * 100}%` }}
                >
                  {bar.gain > 0 && <span className="w-full rounded-t-[4px]" style={{ height: `${(bar.gain / total) * 100}%`, minHeight: 2, background: "var(--series-gain)" }} />}
                  <span className={cn("w-full", bar.gain > 0 ? "" : "rounded-t-[4px]")} style={{ height: `${(bar.base / total) * 100}%`, background: "var(--series-base)" }} />
                </span>
              </button>
            );
          })}

          {shown && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-52 -translate-x-1/2 rounded-2xl border border-border bg-card p-3 text-sm shadow-xl"
              style={{ left: `clamp(6.5rem, ${((active! + 0.5) / data.length) * 100}%, calc(100% - 6.5rem))` }}
            >
              <p className="font-bold">Year {shown.year}</p>
              <p className="mt-1.5 flex justify-between gap-3"><span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: "var(--series-base)" }} />{baseLabel}</span><span className="font-semibold tabular-nums">{formatLakhCrore(shown.base)}</span></p>
              <p className="mt-1 flex justify-between gap-3"><span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: "var(--series-gain)" }} />{gainLabel}</span><span className="font-semibold tabular-nums">{formatLakhCrore(shown.gain)}</span></p>
              {totalLabel && <p className="mt-1.5 flex justify-between gap-3 border-t border-border pt-1.5"><span className="text-muted">{totalLabel}</span><span className="font-bold tabular-nums">{formatLakhCrore(shown.base + shown.gain)}</span></p>}
            </div>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-[3px] pl-12">
        {data.map((bar, index) => (
          <span key={bar.year} className="min-w-0 flex-1 text-center text-[11px] font-medium text-muted">
            {labelled(index) ? `Y${bar.year}` : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
