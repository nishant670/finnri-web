"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Calculator,
  ChartLine,
  CheckCircle2,
  ChevronDown,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import {
  calculateEMI,
  calculateSIP,
  type EMICalculation,
  type SIPCalculation,
  type SIPInput,
  SIP_PRESETS,
  type SIPPresetID,
  validateEMIInput,
  validateSIPInput,
} from "@/app/lib/calculators";

type ActiveCalculator = "sip" | "emi";

export default function PublicToolsClient() {
  const [activeCalculator, setActiveCalculator] = useState<ActiveCalculator>("sip");
  const [activeSIPPresetID, setActiveSIPPresetID] = useState<SIPPresetID>("mutual_fund");
  const [sipInput, setSipInput] = useState<SIPInput>(SIP_PRESETS[0]);
  const [sipResult, setSipResult] = useState<SIPCalculation | null>(() => calculateSIP(SIP_PRESETS[0]));
  const [sipError, setSipError] = useState("");
  const [showSIPBreakdown, setShowSIPBreakdown] = useState(false);
  const [principal, setPrincipal] = useState(1000000);
  const [rate, setRate] = useState(9);
  const [months, setMonths] = useState(60);
  const [emiResult, setEmiResult] = useState<EMICalculation | null>(() => calculateEMI({ principalAmount: 1000000, annualInterestRatePercent: 9, tenureMonths: 60 }));
  const [emiError, setEmiError] = useState("");
  const [showEMISchedule, setShowEMISchedule] = useState(false);

  const applySIPPreset = (preset: SIPInput) => {
    setActiveSIPPresetID(preset.id);
    setSipInput(preset);
    setSipResult(calculateSIP(preset));
    setSipError("");
    setShowSIPBreakdown(false);
  };

  const updateSIPInput = (patch: Partial<SIPInput>) => {
    setSipInput((current) => ({ ...current, ...patch, id: "custom", label: "Custom" }));
    setActiveSIPPresetID("custom");
  };

  const submitSIP = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateSIPInput(sipInput);
    if (errors.length) {
      setSipError(errors.join(" "));
      return;
    }
    setSipError("");
    setSipResult(calculateSIP(sipInput));
    setShowSIPBreakdown(false);
  };

  const submitEMI = (event: FormEvent) => {
    event.preventDefault();
    const roundedMonths = Math.round(months);
    const input = { principalAmount: principal, annualInterestRatePercent: rate, tenureMonths: roundedMonths };
    const errors = validateEMIInput(input);
    if (errors.length) {
      setEmiError(errors.join(" "));
      return;
    }
    setMonths(roundedMonths);
    setEmiError("");
    setEmiResult(calculateEMI(input));
    setShowEMISchedule(false);
  };

  return (
    <>
      <section className="overflow-hidden border-b border-border bg-white dark:bg-zinc-950">
        <div className="container mx-auto grid gap-10 px-6 py-10 xl:min-h-[calc(100vh-5rem)] xl:grid-cols-[0.85fr_1.15fr] xl:items-center xl:py-14 2xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-4 py-1.5 text-sm font-bold text-accent">
              <Calculator className="h-4 w-4" />
              Free financial calculators
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight font-rounded sm:text-5xl">
              EMI calculator and SIP calculator
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-text-muted">
              Estimate loan repayments and SIP maturity value instantly. No login, no account, no dashboard required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setActiveCalculator("sip")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20">
                Use SIP calculator <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setActiveCalculator("emi")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-6 text-sm font-bold shadow-sm dark:bg-zinc-900">
                Use EMI calculator
              </button>
            </div>
            <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-x-6">
              {["Free for everyone", "Built for INR", "Works without login"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-text-muted">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <section id="calculators" className="@container rounded-panel border border-border bg-background p-4 shadow-2xl shadow-zinc-950/10 sm:p-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 dark:bg-zinc-900">
              {[
                { id: "sip" as const, label: "SIP Calculator", icon: ChartLine },
                { id: "emi" as const, label: "EMI Calculator", icon: Calculator },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveCalculator(tool.id)}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition",
                    activeCalculator === tool.id ? "bg-accent text-zinc-950 shadow-sm" : "text-text-muted hover:bg-zinc-50 dark:hover:bg-zinc-800",
                  )}
                >
                  <tool.icon className="h-4 w-4" />
                  {tool.label}
                </button>
              ))}
            </div>

            {activeCalculator === "sip" ? (
              <div className="mt-5 grid gap-5 @3xl:grid-cols-2">
                <form onSubmit={submitSIP} className="@container space-y-4 rounded-surface border border-border bg-white p-5 dark:bg-zinc-900">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">SIP details</p>
                    <h2 className="mt-1 text-xl font-bold font-rounded">Investment projection</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SIP_PRESETS.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => applySIPPreset(preset)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", activeSIPPresetID === preset.id ? "border-accent bg-accent text-zinc-950" : "border-border bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300")}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <NumberField label="Monthly investment" value={sipInput.monthlyInvestment} min={1} onChange={(value) => updateSIPInput({ monthlyInvestment: value })} />
                  <div className="grid gap-4 @sm:grid-cols-2">
                    <NumberField label="Expected return % p.a." value={sipInput.expectedAnnualReturnPercent} min={0} max={100} step={0.01} onChange={(value) => updateSIPInput({ expectedAnnualReturnPercent: value })} />
                    <NumberField label="Tenure in years" value={sipInput.tenureYears} min={0.08} max={60} step={0.01} onChange={(value) => updateSIPInput({ tenureYears: value })} />
                  </div>
                  <div className="grid gap-4 @sm:grid-cols-2">
                    <NumberField label="Annual step-up %" value={sipInput.annualStepUpPercent} min={0} max={100} step={0.01} onChange={(value) => updateSIPInput({ annualStepUpPercent: value })} />
                    <NumberField label="Current corpus" value={sipInput.currentCorpus} min={0} onChange={(value) => updateSIPInput({ currentCorpus: value })} />
                  </div>
                  {sipError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{sipError}</p>}
                  <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-zinc-950">
                    <TrendingUp className="h-4 w-4" /> Calculate SIP
                  </button>
                </form>
                <ResultPanel
                  title="Estimated maturity value"
                  primary={sipResult ? formatMoney(sipResult.maturityValue) : "Calculate to view"}
                  empty={!sipResult}
                  metrics={sipResult ? [
                    { label: "Invested amount", value: formatMoney(sipResult.investedAmount) },
                    { label: "Estimated returns", value: formatMoney(sipResult.estimatedReturns), accent: true },
                  ] : []}
                >
                  {sipResult && (
                    <>
                      <button onClick={() => setShowSIPBreakdown((show) => !show)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-300">
                        {showSIPBreakdown ? "Hide" : "View"} yearly breakdown <ChevronDown className={cn("h-4 w-4 transition", showSIPBreakdown && "rotate-180")} />
                      </button>
                      {showSIPBreakdown && (
                        <ScheduleTable
                          headers={["Year", "Invested", "Value"]}
                          rows={sipResult.breakdown.map((row) => [String(row.year), formatMoney(row.yearlyInvestment), formatMoney(row.yearEndValue)])}
                        />
                      )}
                    </>
                  )}
                </ResultPanel>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 @3xl:grid-cols-2">
                <form onSubmit={submitEMI} className="@container space-y-4 rounded-surface border border-border bg-white p-5 dark:bg-zinc-900">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">EMI details</p>
                    <h2 className="mt-1 text-xl font-bold font-rounded">Loan repayment estimate</h2>
                  </div>
                  <NumberField label="Loan amount" value={principal} min={1} onChange={setPrincipal} />
                  <div className="grid gap-4 @sm:grid-cols-2">
                    <NumberField label="Annual interest %" value={rate} min={0} max={100} step={0.01} onChange={setRate} />
                    <NumberField label="Tenure in months" value={months} min={1} max={360} step={1} onChange={setMonths} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[12, 36, 60, 120, 240].map((preset) => (
                      <button key={preset} type="button" onClick={() => setMonths(preset)} className={cn("rounded-full border px-3 py-2 text-xs font-bold", months === preset ? "border-accent bg-accent text-zinc-950" : "border-border bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300")}>
                        {preset < 12 ? `${preset}M` : `${preset / 12}Y`}
                      </button>
                    ))}
                  </div>
                  {emiError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{emiError}</p>}
                  <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-zinc-950">
                    <IndianRupee className="h-4 w-4" /> Calculate EMI
                  </button>
                </form>
                <ResultPanel
                  title="Estimated monthly EMI"
                  primary={emiResult ? formatMoney(emiResult.monthlyEMI) : "Calculate to view"}
                  empty={!emiResult}
                  metrics={emiResult ? [
                    { label: "Total payment", value: formatMoney(emiResult.totalPayment) },
                    { label: "Total interest", value: formatMoney(emiResult.totalInterest), accent: true },
                  ] : []}
                >
                  {emiResult && (
                    <>
                      <button onClick={() => setShowEMISchedule((show) => !show)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-300">
                        {showEMISchedule ? "Hide" : "View"} amortization schedule <ChevronDown className={cn("h-4 w-4 transition", showEMISchedule && "rotate-180")} />
                      </button>
                      {showEMISchedule && (
                        <ScheduleTable
                          headers={["Month", "Principal", "Interest", "Balance"]}
                          rows={emiResult.schedule.map((row) => [String(row.month), formatMoney(row.principalAmount), formatMoney(row.interestAmount), formatMoney(row.closingBalance)])}
                        />
                      )}
                    </>
                  )}
                </ResultPanel>
              </div>
            )}
          </section>
        </div>
      </section>

    </>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-300">{label}</span>
      <input
        type="number"
        required
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-zinc-800"
      />
    </label>
  );
}

function ResultPanel({
  title,
  primary,
  empty,
  metrics,
  children,
}: {
  title: string;
  primary: string;
  empty: boolean;
  metrics: Array<{ label: string; value: string; accent?: boolean }>;
  children: ReactNode;
}) {
  return (
    <div className="@container rounded-surface border border-border bg-white p-5 dark:bg-zinc-900 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className={cn("mt-3 text-2xl font-bold tabular-nums break-words font-rounded @3xs:text-3xl @xs:text-4xl @xl:text-5xl", empty && "text-zinc-500 dark:text-zinc-400")}>{primary}</p>
      {metrics.length > 0 && (
        <div className="mt-7 grid gap-3 @xs:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{metric.label}</p>
              <p className={cn("mt-1 text-lg font-bold", metric.accent && "text-accent")}>{metric.value}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function ScheduleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-border">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <tr>
            {headers.map((header) => <th key={header} className="p-3">{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-border">
              {row.map((cell, index) => <td key={`${cell}-${index}`} className="p-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
