import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ArrowRight, Calculator, TrendingUp } from "lucide-react";
import { AppCta, FaqSection, ToolHero, ToolPageFrame, ToolSchemas, type Crumb, type Faq } from "@/app/components/tools/ToolPage";
import { calculateEMI, calculateSIP, EMI_PRESETS, PROJECTION_DISCLAIMER, SIP_PRESETS, summarizeEMIByYear, summarizeSIPByYear } from "@/app/lib/calculators";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";

const title = "Free SIP & EMI Calculators for India | Finnri";
const description = "Free SIP and EMI calculators for India: step-up SIP projections in lakh and crore, loan EMIs with full repayment schedules. No login, runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["EMI calculator", "SIP calculator", "free EMI calculator", "free SIP calculator", "loan EMI calculator India", "mutual fund SIP calculator", "investment calculator India"],
  alternates: { canonical: "/tools" },
  openGraph: { title, description, url: "/tools", siteName: "Finnri", type: "website" },
};

const crumbs: Crumb[] = [
  { name: "Home", href: "/" },
  { name: "Free tools", href: "/tools" },
];

const faqs: Faq[] = [
  { q: "Are these calculators free?", a: "Yes. Both calculators are free for everyone, with no account, sign-up or download." },
  { q: "Is anything I enter saved or sent?", a: "No. The maths runs in your browser; the numbers you type never leave your device." },
  { q: "Are the results financial advice?", a: PROJECTION_DISCLAIMER },
];

export default function ToolsPage() {
  const sip = calculateSIP(SIP_PRESETS[0]);
  const emi = calculateEMI(EMI_PRESETS[0]);
  const sipBars = summarizeSIPByYear(sip).map((year) => ({ base: year.investedSoFar, total: year.value }));
  const emiBars = summarizeEMIByYear(emi.schedule).map((year) => ({ base: year.principalPaid, total: year.principalPaid + year.interestPaid }));

  return (
    <ToolPageFrame>
      <ToolSchemas crumbs={crumbs} faqs={faqs} />
      <ToolHero
        crumbs={crumbs}
        title={<>Money calculators, <span className="text-ink-gradient">free for good.</span></>}
        lead="Plan an SIP or size up a loan in seconds. Built for rupees, lakh and crore, with every number shown year by year."
        points={["No sign-up", "Runs in your browser", "Made for India"]}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <ToolCard
            href="/tools/sip-calculator"
            icon={<TrendingUp className="h-6 w-6" />}
            name="SIP calculator"
            body="What a monthly SIP could grow to, with a yearly step-up and money already invested."
            example="₹10,000 a month · 12% · 10 years · +10% a year"
            value={formatLakhCrore(sip.maturityValue)}
            valueLabel={`estimated value · you put in ${formatLakhCrore(sip.investedAmount)}`}
            bars={sipBars}
          />
          <ToolCard
            href="/tools/emi-calculator"
            icon={<Calculator className="h-6 w-6" />}
            name="EMI calculator"
            body="The monthly EMI on any loan, the total interest, and a month-by-month schedule."
            example="₹30 lakh home loan · 8.5% · 20 years"
            value={`${formatMoney(Math.round(emi.monthlyEMI))}/mo`}
            valueLabel={`${formatLakhCrore(emi.totalInterest)} interest over the loan`}
            bars={emiBars}
          />
        </div>
      </ToolHero>

      <FaqSection faqs={faqs} title="About these calculators" />

      <AppCta title="Planning is step one. Tracking is step two." body="Finnri logs your spending by voice or text, shows SIPs, EMIs and bills before they’re due, and never asks for a bank login." />
    </ToolPageFrame>
  );
}

/** A calculator's card on the hub: what it does, a sample answer, and a sketch of its chart. */
function ToolCard({ href, icon, name, body, example, value, valueLabel, bars }: { href: string; icon: ReactNode; name: string; body: string; example: string; value: string; valueLabel: string; bars: { base: number; total: number }[] }) {
  const top = Math.max(...bars.map((bar) => bar.total));
  return (
    <Link href={href} className="group flex flex-col rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8">
      <span className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-selected text-accent">{icon}</span>
        <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-bold transition group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent">Open <ArrowRight className="h-4 w-4" /></span>
      </span>
      <h2 className="font-display mt-6 text-3xl font-bold">{name}</h2>
      <p className="mt-2 leading-relaxed text-muted">{body}</p>
      <div aria-hidden="true" className="mt-7 flex h-24 items-end gap-[3px]">
        {bars.map((bar, index) => (
          <span key={index} className="flex min-w-0 flex-1 flex-col justify-end gap-[2px]" style={{ height: `${(bar.total / top) * 100}%` }}>
            <span className="rounded-t-[3px]" style={{ flexGrow: bar.total - bar.base, background: "var(--series-gain)" }} />
            <span style={{ flexGrow: bar.base, background: "var(--series-base)" }} />
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted">{example}</p>
      <p className="font-display mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted">{valueLabel}</p>
    </Link>
  );
}
