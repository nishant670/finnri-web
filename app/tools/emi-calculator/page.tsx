import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import EmiCalculator from "@/app/components/tools/EmiCalculator";
import { AppCta, FaqSection, RelatedTool, SectionHeading, ToolHero, ToolPageFrame, ToolSchemas, toolShell, type Crumb, type Faq } from "@/app/components/tools/ToolPage";
import { calculateEMI, calculateSIP, EMI_PRESETS, PROJECTION_DISCLAIMER, SIP_PRESETS } from "@/app/lib/calculators";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";

const title = "EMI Calculator for Home, Car & Personal Loans | Finnri";
const description = "Free EMI calculator for India. Work out the monthly EMI on any loan, the total interest, and a year-by-year and month-by-month repayment schedule. No sign-up.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["EMI calculator", "home loan EMI calculator", "car loan EMI calculator", "personal loan EMI calculator", "loan EMI calculator India", "amortization schedule"],
  alternates: { canonical: "/tools/emi-calculator" },
  openGraph: { title, description, url: "/tools/emi-calculator", siteName: "Finnri", type: "website" },
};

const crumbs: Crumb[] = [
  { name: "Home", href: "/" },
  { name: "Free tools", href: "/tools" },
  { name: "EMI calculator", href: "/tools/emi-calculator" },
];

const money = (value: number) => formatMoney(Math.round(value));

export default function EmiCalculatorPage() {
  // Worked examples from the calculator's own function.
  const home = calculateEMI(EMI_PRESETS[0]);
  const longer = calculateEMI({ ...EMI_PRESETS[0], tenureMonths: 360 });
  const firstMonth = home.schedule[0];
  const sip = calculateSIP(SIP_PRESETS[0]);

  const faqs: Faq[] = [
    { q: "What is an EMI?", a: "An EMI (equated monthly instalment) is the fixed amount you pay a lender every month until a loan is repaid. Each EMI covers that month's interest first; the rest pays down the loan itself." },
    { q: "How is EMI calculated?", a: `EMI = P × r × (1 + r)^n ÷ [(1 + r)^n − 1], where P is the loan amount, r the monthly rate (yearly rate ÷ 12 ÷ 100) and n the number of months. A ${formatLakhCrore(3000000)} home loan at 8.5% for 20 years works out to ${money(home.monthlyEMI)} a month.` },
    { q: "Does a longer tenure lower my EMI?", a: `Yes, but you pay more interest. Stretching that ${formatLakhCrore(3000000)} loan from 20 to 30 years cuts the EMI from ${money(home.monthlyEMI)} to ${money(longer.monthlyEMI)}, while total interest rises from ${formatLakhCrore(home.totalInterest)} to ${formatLakhCrore(longer.totalInterest)}.` },
    { q: "Why is most of my early EMI interest?", a: `Interest is charged on what you still owe, and early on you owe almost all of it. In the first month of the example loan, ${money(firstMonth.interestAmount)} of the ${money(firstMonth.paymentAmount)} EMI is interest and only ${money(firstMonth.principalAmount)} reduces the loan. The month-by-month schedule above shows the shift.` },
    { q: "What happens if I prepay?", a: "A prepayment reduces what you owe, so less interest builds up afterwards. Lenders then either lower your EMI or shorten the tenure. This calculator assumes no prepayments and a fixed rate, so use it as the baseline to compare against." },
    { q: "Is the EMI shown exact?", a: `It is calculated to the paisa with the standard formula, but lenders round differently and may add fees or a broken-period charge, so your schedule can differ slightly. ${PROJECTION_DISCLAIMER}` },
  ];

  return (
    <ToolPageFrame>
      <ToolSchemas crumbs={crumbs} faqs={faqs} app={{ name: "Finnri EMI Calculator", description, path: "/tools/emi-calculator" }} />
      <ToolHero
        crumbs={crumbs}
        title={<>EMI <span className="text-ink-gradient">calculator</span></>}
        lead="Work out the monthly EMI on a home, car, personal or education loan, and see how much of every year’s payments goes to interest."
        points={["Free, no sign-up", "Runs in your browser", "Full repayment schedule"]}
      >
        <EmiCalculator />
      </ToolHero>

      <section className="border-y border-border bg-card/40 py-16 lg:py-24">
        <div className={toolShell}>
          <SectionHeading eyebrow="How it works" title="What your EMI is made of." body="The EMI stays the same every month, but what it pays for changes. Here’s the standard formula and a real example." />
          <div className="grid gap-4 md:grid-cols-3">
            <article data-reveal className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">The formula</p>
              <p className="font-display mt-4 text-xl font-bold leading-snug">EMI = P × r × (1 + r)<sup>n</sup> ÷ [(1 + r)<sup>n</sup> − 1]</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex gap-3"><dt className="w-6 font-bold">P</dt><dd className="text-muted">the loan amount</dd></div>
                <div className="flex gap-3"><dt className="w-6 font-bold">r</dt><dd className="text-muted">yearly rate ÷ 12 ÷ 100</dd></div>
                <div className="flex gap-3"><dt className="w-6 font-bold">n</dt><dd className="text-muted">tenure in months</dd></div>
              </dl>
            </article>
            <article data-reveal style={{ "--reveal-delay": "100ms" } as CSSProperties} className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">A worked example</p>
              <p className="mt-4 leading-relaxed text-muted">A ₹30 lakh home loan at 8.5% for 20 years:</p>
              <p className="font-display mt-3 text-3xl font-bold tabular-nums">{money(home.monthlyEMI)}<span className="text-base font-semibold text-muted"> /month</span></p>
              <p className="mt-2 text-sm text-muted">Over 240 EMIs you repay {formatLakhCrore(home.totalPayment)}, of which {formatLakhCrore(home.totalInterest)} is interest.</p>
            </article>
            <article data-reveal style={{ "--reveal-delay": "200ms" } as CSSProperties} className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">The first EMI</p>
              <p className="mt-4 leading-relaxed text-muted">Of that loan’s first {money(firstMonth.paymentAmount)}:</p>
              <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
                <span style={{ flexGrow: firstMonth.principalAmount, background: "var(--series-base)" }} />
                <span style={{ flexGrow: firstMonth.interestAmount, background: "var(--series-gain)" }} />
              </div>
              <p className="mt-3 flex justify-between text-sm"><span className="text-muted">Interest</span><span className="font-bold tabular-nums">{money(firstMonth.interestAmount)}</span></p>
              <p className="mt-1 flex justify-between text-sm"><span className="text-muted">Loan paid down</span><span className="font-bold tabular-nums">{money(firstMonth.principalAmount)}</span></p>
            </article>
          </div>
        </div>
      </section>

      <FaqSection faqs={faqs} title="EMI calculator questions" />

      <section className="pb-16 lg:pb-24">
        <div className={toolShell}>
          <RelatedTool
            href="/tools/sip-calculator"
            title="SIP calculator"
            body="Planning to invest too? See what a monthly SIP with a yearly step-up could grow to."
            sample={formatLakhCrore(sip.maturityValue)}
            sampleLabel="₹10,000/month, 12%, 10 years, +10% a year"
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>
      </section>

      <AppCta title="Know every EMI before it’s due." body="Finnri shows your EMIs, SIPs and bills before they’re due, and tracks everyday spending by voice or text, without a bank login." />
    </ToolPageFrame>
  );
}
