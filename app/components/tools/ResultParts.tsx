"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";

/** One bar split in two, each part labelled with its amount and share. */
export function SplitBar({ base, gain, baseLabel, gainLabel }: { base: number; gain: number; baseLabel: string; gainLabel: string }) {
  const total = base + gain || 1;
  const basePercent = Math.round((base / total) * 100);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
        <span className="transition-[flex-grow] duration-500" style={{ flexGrow: base, background: "var(--series-base)" }} />
        {gain > 0 && <span className="transition-[flex-grow] duration-500" style={{ flexGrow: gain, background: "var(--series-gain)" }} />}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-background p-4">
          <dt className="flex items-center gap-2 text-sm text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-base)" }} />{baseLabel}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{formatMoney(Math.round(base))}</dd>
          <dd className="text-xs font-medium text-muted">{basePercent}% of the total</dd>
        </div>
        <div className="rounded-2xl bg-background p-4">
          <dt className="flex items-center gap-2 text-sm text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-gain)" }} />{gainLabel}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{formatMoney(Math.round(gain))}</dd>
          <dd className="text-xs font-medium text-muted">{100 - basePercent}% of the total</dd>
        </div>
      </dl>
    </div>
  );
}

/** A plain table of the numbers behind a chart, scrolling inside its own box. */
export function NumbersTable({ headers, rows, caption }: { headers: string[]; rows: (string | number)[][]; caption: string }) {
  return (
    <div className="max-h-80 overflow-auto rounded-2xl border border-border">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted shadow-[0_1px_0_var(--border)]">
          <tr>{headers.map((header, index) => <th key={header} scope="col" className={cn("px-4 py-3 font-semibold", index > 0 && "text-right")}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-border">
              {row.map((cell, index) => <td key={index} className={cn("px-4 py-2.5 tabular-nums", index === 0 ? "font-semibold" : "text-right")}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const noSubscribe = () => () => {};

/**
 * On phones the result sits below the inputs, so dragging a slider would hide
 * the answer. This bar carries the headline number while the inputs are on
 * screen and the result card isn't. It renders into <body>: the calculator
 * sits inside an animated (transformed) box, which would otherwise pin a
 * fixed element to that box instead of the screen.
 */
export function StickySummary({ label, value, inputsRef, resultRef }: { label: string; value: ReactNode; inputsRef: RefObject<HTMLElement | null>; resultRef: RefObject<HTMLElement | null> }) {
  const [inputsVisible, setInputsVisible] = useState(false);
  const [resultVisible, setResultVisible] = useState(true);

  useEffect(() => {
    const inputs = inputsRef.current;
    const result = resultRef.current;
    if (!inputs || !result) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === inputs) setInputsVisible(entry.isIntersecting);
        if (entry.target === result) setResultVisible(entry.isIntersecting);
      }
    }, { rootMargin: "0px 0px -80px 0px" });
    observer.observe(inputs);
    observer.observe(result);
    return () => observer.disconnect();
  }, [inputsRef, resultRef]);

  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  const show = inputsVisible && !resultVisible;
  if (!inBrowser) return null;
  return createPortal(
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur transition duration-300 lg:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="font-display text-xl font-bold tabular-nums">{value}</span>
    </div>,
    document.body,
  );
}
