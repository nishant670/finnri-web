"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/app/lib/utils";

const grouped = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * One calculator input: a label, a box you can type into, and a slider under
 * it. The slider covers the usual range; the box accepts anything up to
 * `hardMax`, so an unusual loan or a long horizon still works. Money shows
 * with Indian grouping (10,00,000) except while you are typing.
 */
export default function CalcField({
  label,
  value,
  onChange,
  min,
  max,
  hardMax = max,
  step,
  prefix,
  suffix,
  rangeUnit = "",
  money = false,
  hint,
  aside,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  hardMax?: number;
  step: number;
  prefix?: string;
  suffix?: string;
  /** The unit on the slider's end labels, e.g. "%" or "Y". */
  rangeUnit?: string;
  money?: boolean;
  hint?: ReactNode;
  /** A control beside the box, such as a years/months switch. */
  aside?: ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const fill = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const typed = draft === null ? null : Number(draft.replace(/,/g, ""));
  const outOfRange = draft !== null && (draft.trim() === "" || !Number.isFinite(typed) || typed! < min || typed! > hardMax);

  const commit = (text: string) => {
    const parsed = Number(text.replace(/,/g, ""));
    if (text.trim() !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= hardMax) onChange(parsed);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
        <div className="flex items-center gap-2">
          {aside}
          <span className={cn("flex h-11 items-center rounded-xl border bg-background px-3 transition focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)]", outOfRange ? "border-negative" : "border-border")}>
            {prefix && <span className="mr-1 text-[15px] font-semibold text-muted">{prefix}</span>}
            <input
              id={id}
              inputMode="decimal"
              value={draft ?? (money ? grouped(value) : String(value))}
              onFocus={(event) => { setDraft(String(value)); requestAnimationFrame(() => event.target.select()); }}
              onChange={(event) => { const text = event.target.value.replace(/[^\d.,]/g, ""); setDraft(text); commit(text); }}
              onBlur={() => setDraft(null)}
              aria-invalid={outOfRange || undefined}
              aria-describedby={outOfRange ? `${id}-range` : undefined}
              className="bg-transparent text-right text-[16px] font-bold tabular-nums"
              style={{ outline: "none", width: `${Math.max(3, (draft ?? (money ? grouped(value) : String(value))).length + 1)}ch` }}
            />
            {suffix && <span className="ml-1 text-sm font-semibold text-muted">{suffix}</span>}
          </span>
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range mt-3"
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-xs font-medium text-muted">
        <span>{prefix}{money ? grouped(min) : min}{rangeUnit}</span>
        {outOfRange ? (
          <span id={`${id}-range`} className="font-semibold text-negative">Between {prefix}{grouped(min)} and {prefix}{grouped(hardMax)}{rangeUnit}</span>
        ) : hint ? <span>{hint}</span> : null}
        <span>{prefix}{money ? grouped(max) : max}{rangeUnit}</span>
      </div>
    </div>
  );
}
