"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Table2 } from "lucide-react";
import CalcField from "@/app/components/tools/CalcField";
import YearBars from "@/app/components/tools/YearBars";
import { NumbersTable, SplitBar, StickySummary } from "@/app/components/tools/ResultParts";
import { calculateEMI, EMI_PRESETS, PROJECTION_DISCLAIMER, summarizeEMIByYear, type EMIPresetID } from "@/app/lib/calculators";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";

const money = (value: number) => formatMoney(Math.round(value));

// Today's month, read only in the browser: the server can't know the visitor's
// clock, so the payoff date appears after hydration rather than mismatching.
const noSubscribe = () => () => {};
const thisMonth = () => { const now = new Date(); return `${now.getFullYear()}-${now.getMonth()}`; };

/**
 * The public EMI calculator: loan type presets, then amount, rate and tenure,
 * with the tenure in years or months. Recalculates on every change.
 */
export default function EmiCalculator() {
  const [presetId, setPresetId] = useState<EMIPresetID | "custom">(EMI_PRESETS[0].id);
  const [principal, setPrincipal] = useState(EMI_PRESETS[0].principalAmount);
  const [rate, setRate] = useState(EMI_PRESETS[0].annualInterestRatePercent);
  const [months, setMonths] = useState(EMI_PRESETS[0].tenureMonths);
  const [unit, setUnit] = useState<"years" | "months">("years");
  const [table, setTable] = useState<"closed" | "yearly" | "monthly">("closed");
  const inputsRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const month = useSyncExternalStore(noSubscribe, thisMonth, () => null);

  const result = useMemo(() => calculateEMI({ principalAmount: principal, annualInterestRatePercent: rate, tenureMonths: months }), [principal, rate, months]);
  const years = useMemo(() => summarizeEMIByYear(result.schedule), [result]);

  const choose = (id: EMIPresetID) => {
    const preset = EMI_PRESETS.find((candidate) => candidate.id === id)!;
    setPresetId(id);
    setPrincipal(preset.principalAmount);
    setRate(preset.annualInterestRatePercent);
    setMonths(preset.tenureMonths);
  };
  const edit = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPresetId("custom"); };

  const payoff = month === null ? null : (() => {
    const [year, monthIndex] = month.split("-").map(Number);
    // The first EMI is usually due the month after the loan is taken.
    return new Date(year, monthIndex + result.schedule.length, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  })();
  const interestShare = result.totalInterest / principal;
  const tenureText = months % 12 === 0 ? `${months / 12} ${months === 12 ? "year" : "years"}` : `${months} months`;

  const unitSwitch = (
    <span className="flex rounded-full bg-background p-0.5 text-xs font-semibold" role="group" aria-label="Tenure unit">
      {(["years", "months"] as const).map((option) => (
        <button key={option} type="button" onClick={() => setUnit(option)} aria-pressed={unit === option} className={cn("h-7 rounded-full px-2.5 transition", unit === option ? "bg-card shadow-sm" : "text-muted")}>
          {option === "years" ? "Yr" : "Mo"}
        </button>
      ))}
    </span>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div ref={inputsRef} className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.35)] sm:p-7">
        <p className="text-sm font-semibold text-muted" id="emi-preset-label">Loan type</p>
        <div role="radiogroup" aria-labelledby="emi-preset-label" className="mt-2.5 flex flex-wrap gap-2">
          {EMI_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={presetId === preset.id}
              onClick={() => choose(preset.id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-semibold transition",
                presetId === preset.id ? "border-accent bg-accent text-on-accent" : "border-border bg-background text-muted hover:border-accent/50 hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-7 space-y-7">
          <CalcField label="Loan amount" money prefix="₹" value={principal} onChange={edit(setPrincipal)} min={10000} max={20000000} hardMax={1000000000} step={10000} />
          <CalcField label="Interest rate" suffix="% a year" rangeUnit="%" value={rate} onChange={edit(setRate)} min={1} max={24} hardMax={100} step={0.05} />
          {unit === "years" ? (
            <CalcField key="years" label="Loan tenure" suffix={months === 12 ? "year" : "years"} rangeUnit="Y" value={Math.round((months / 12) * 100) / 100} onChange={edit((value: number) => setMonths(Math.max(1, Math.round(value * 12))))} min={1} max={30} hardMax={30} step={1} aside={unitSwitch} />
          ) : (
            <CalcField key="months" label="Loan tenure" suffix="months" rangeUnit=" mo" value={months} onChange={edit((value: number) => setMonths(Math.round(value)))} min={1} max={360} step={1} aside={unitSwitch} />
          )}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">Preset rates are examples, not offers. Use the rate on your sanction letter.</p>
      </div>

      <div ref={resultRef} className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.35)] sm:p-7">
        <p className="text-sm font-semibold text-muted">Your monthly EMI</p>
        <p className="font-display mt-2 text-[44px] font-bold leading-none tabular-nums sm:text-[56px]">{money(result.monthlyEMI)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-selected px-3 py-1 font-semibold">for {tenureText}</span>
          <span className="rounded-full bg-background px-3 py-1 font-semibold text-muted">Interest adds {Math.round(interestShare * 100)}% to the loan</span>
          {payoff && <span className="rounded-full bg-background px-3 py-1 font-semibold text-muted">Last EMI around {payoff}</span>}
        </p>

        <div className="mt-7">
          <SplitBar base={principal} gain={result.totalInterest} baseLabel="Principal" gainLabel="Total interest" />
          <p className="mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
            <span className="text-muted">Total you pay the bank</span>
            <span className="font-bold tabular-nums">{money(result.totalPayment)} <span className="font-medium text-muted">· {formatLakhCrore(result.totalPayment)}</span></span>
          </p>
        </div>

        <div className="mt-8">
          <p className="mb-1 font-bold">Where each year’s EMIs go</p>
          <p className="mb-4 text-sm text-muted">Early EMIs are mostly interest; the principal share grows every year.</p>
          <YearBars
            data={years.map((year) => ({ year: year.year, base: year.principalPaid, gain: year.interestPaid }))}
            baseLabel="Principal"
            gainLabel="Interest"
            totalLabel="Paid that year"
            caption={`Principal and interest paid in each year of a ${tenureText} loan.`}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["yearly", "monthly"] as const).map((view) => (
            <button key={view} type="button" onClick={() => setTable((current) => current === view ? "closed" : view)} aria-expanded={table === view} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition", table === view ? "border-foreground/30 bg-background" : "border-border hover:bg-background")}>
              <Table2 className="h-4 w-4" /> {view === "yearly" ? "Year-by-year" : "Month-by-month"} schedule <ChevronDown className={cn("h-4 w-4 transition", table === view && "rotate-180")} />
            </button>
          ))}
        </div>
        {table === "yearly" && (
          <div className="disclosure-enter mt-4">
            <NumbersTable caption="Loan repayment by year" headers={["Year", "Principal", "Interest", "Balance left"]} rows={years.map((year) => [year.year, money(year.principalPaid), money(year.interestPaid), money(year.closingBalance)])} />
          </div>
        )}
        {table === "monthly" && (
          <div className="disclosure-enter mt-4">
            <NumbersTable caption="Loan repayment by month" headers={["Month", "EMI", "Principal", "Interest", "Balance left"]} rows={result.schedule.map((row) => [row.month, formatMoney(row.paymentAmount), formatMoney(row.principalAmount), formatMoney(row.interestAmount), formatMoney(row.closingBalance)])} />
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-selected/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed"><span className="font-bold">Paying this EMI?</span> Finnri shows it before it’s due each month, and you mark it paid in a tap.</p>
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-eyebrow hover:underline">See Finnri <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">{PROJECTION_DISCLAIMER} Assumes a fixed rate and no prepayments; your lender’s schedule may differ by a few rupees.</p>
      </div>

      <StickySummary label="Monthly EMI" value={money(result.monthlyEMI)} inputsRef={inputsRef} resultRef={resultRef} />
    </div>
  );
}
