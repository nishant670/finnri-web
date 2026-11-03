"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Table2 } from "lucide-react";
import CalcField from "@/app/components/tools/CalcField";
import YearBars from "@/app/components/tools/YearBars";
import { NumbersTable, SplitBar, StickySummary } from "@/app/components/tools/ResultParts";
import { calculateSIP, PROJECTION_DISCLAIMER, SIP_PRESETS, summarizeSIPByYear, type SIPInput, type SIPPresetID } from "@/app/lib/calculators";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";

const money = (value: number) => formatMoney(Math.round(value));

/**
 * The public SIP calculator. Every change recalculates at once; there is no
 * Calculate button to forget. Inputs only ever hold valid numbers (CalcField
 * refuses the rest), so the result is always current.
 */
export default function SipCalculator() {
  const [input, setInput] = useState<SIPInput>(SIP_PRESETS[0]);
  const [showTable, setShowTable] = useState(false);
  const inputsRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const result = useMemo(() => calculateSIP(input), [input]);

  const update = (patch: Partial<SIPInput>) => setInput((current) => ({ ...current, ...patch, id: "custom", label: "Custom" }));
  const choose = (id: SIPPresetID) => setInput(SIP_PRESETS.find((preset) => preset.id === id)!);

  const years = useMemo(() => summarizeSIPByYear(result), [result]);
  const bars = years.map((year) => ({ year: year.year, base: year.investedSoFar, gain: Math.max(0, year.value - year.investedSoFar) }));
  const multiple = result.investedAmount > 0 ? result.maturityValue / result.investedAmount : 0;
  const horizon = input.tenureYears;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div ref={inputsRef} className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.35)] sm:p-7">
        <p className="text-sm font-semibold text-muted" id="sip-preset-label">Start from</p>
        <div role="radiogroup" aria-labelledby="sip-preset-label" className="mt-2.5 flex flex-wrap gap-2">
          {SIP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={input.id === preset.id}
              onClick={() => choose(preset.id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-semibold transition",
                input.id === preset.id ? "border-accent bg-accent text-on-accent" : "border-border bg-background text-muted hover:border-accent/50 hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-7 space-y-7">
          <CalcField label="Monthly investment" money prefix="₹" value={input.monthlyInvestment} onChange={(value) => update({ monthlyInvestment: value })} min={500} max={200000} hardMax={10000000} step={500} />
          <CalcField label="Expected return" suffix="% a year" rangeUnit="%" value={input.expectedAnnualReturnPercent} onChange={(value) => update({ expectedAnnualReturnPercent: value })} min={1} max={30} hardMax={100} step={0.5} />
          <CalcField label="Time period" suffix={horizon === 1 ? "year" : "years"} rangeUnit="Y" value={input.tenureYears} onChange={(value) => update({ tenureYears: value })} min={1} max={40} hardMax={60} step={1} />
          <CalcField label="Yearly step-up" suffix="%" rangeUnit="%" value={input.annualStepUpPercent} onChange={(value) => update({ annualStepUpPercent: value })} min={0} max={50} hardMax={100} step={1} hint="Raise the SIP each year" />
          <CalcField label="Already invested" money prefix="₹" value={input.currentCorpus} onChange={(value) => update({ currentCorpus: value })} min={0} max={5000000} hardMax={1000000000} step={10000} hint="Optional" />
        </div>
      </div>

      <div ref={resultRef} className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.35)] sm:p-7">
        <p className="text-sm font-semibold text-muted">In {horizon} {horizon === 1 ? "year" : "years"}, your SIP could be worth</p>
        <p className="font-display mt-2 text-[44px] font-bold leading-none tabular-nums sm:text-[56px]">{money(result.maturityValue)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-selected px-3 py-1 font-semibold">≈ {formatLakhCrore(result.maturityValue)}</span>
          {multiple > 0 && <span className="rounded-full bg-background px-3 py-1 font-semibold text-muted">{multiple.toFixed(1)}× what you put in</span>}
        </p>

        <div className="mt-7">
          <SplitBar base={result.investedAmount} gain={result.estimatedReturns} baseLabel="You invest" gainLabel="Est. returns" />
        </div>

        <div className="mt-8">
          <p className="mb-3 font-bold">How it grows, year by year</p>
          <YearBars data={bars} baseLabel="Invested so far" gainLabel="Returns so far" totalLabel="Value" caption={`Value of the SIP at the end of each year, split into the amount invested and the returns, over ${horizon} years.`} />
        </div>

        <button type="button" onClick={() => setShowTable((open) => !open)} aria-expanded={showTable} className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition hover:bg-background">
          <Table2 className="h-4 w-4" /> {showTable ? "Hide" : "Show"} the year-by-year table <ChevronDown className={cn("h-4 w-4 transition", showTable && "rotate-180")} />
        </button>
        {showTable && (
          <div className="disclosure-enter mt-4">
            <NumbersTable
              caption="SIP value at the end of each year"
              headers={["Year", "Monthly SIP", "Invested so far", "Value"]}
              rows={years.map((year) => [year.year, money(year.monthlyInvestment), money(year.investedSoFar), money(year.value)])}
            />
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-selected/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed"><span className="font-bold">Started the SIP?</span> Finnri shows it before it’s due each month, and you mark it paid in a tap.</p>
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-eyebrow hover:underline">See Finnri <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">{PROJECTION_DISCLAIMER} Returns compound monthly and each instalment is counted at the end of its month.</p>
      </div>

      <StickySummary label={`Value in ${horizon} ${horizon === 1 ? "year" : "years"}`} value={formatLakhCrore(result.maturityValue)} inputsRef={inputsRef} resultRef={resultRef} />
    </div>
  );
}
