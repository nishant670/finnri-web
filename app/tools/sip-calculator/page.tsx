import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Calculator } from "lucide-react";
import SipCalculator from "@/app/components/tools/SipCalculator";
import { AppCta, FaqSection, RelatedTool, SectionHeading, ToolHero, ToolPageFrame, ToolSchemas, toolShell, type Crumb, type Faq } from "@/app/components/tools/ToolPage";
import { calculateEMI, calculateSIP, EMI_PRESETS, PROJECTION_DISCLAIMER, SIP_PRESETS } from "@/app/lib/calculators";
import { formatLakhCrore, formatMoney } from "@/app/lib/format";

const title = "SIP Calculator with Step-up: Returns in Lakh & Crore | Finnri";
const description = "Free SIP calculator for India. See what a monthly SIP could grow to, with a yearly step-up and money already invested, plus a year-by-year table. No sign-up.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["SIP calculator", "step up SIP calculator", "mutual fund SIP calculator", "SIP return calculator", "SIP calculator India", "monthly SIP calculator"],
  alternates: { canonical: "/tools/sip-calculator" },
  openGraph: { title, description, url: "/tools/sip-calculator", siteName: "Finnri", type: "website" },
};

const crumbs: Crumb[] = [
  { name: "Home", href: "/" },
  { name: "Free tools", href: "/tools" },
  { name: "SIP calculator", href: "/tools/sip-calculator" },
];

const money = (value: number) => formatMoney(Math.round(value));

export default function SipCalculatorPage() {
  // Worked examples, computed with the same function as the calculator so the
  // explainer can never disagree with it.
  const flat = calculateSIP({ ...SIP_PRESETS[4], monthlyInvestment: 5000, expectedAnnualReturnPercent: 12, tenureYears: 10, annualStepUpPercent: 0, currentCorpus: 0 });
  const stepped = calculateSIP({ ...flat, annualStepUpPercent: 10 });
  const longer = calculateSIP({ ...flat, tenureYears: 20 });
  const emi = calculateEMI(EMI_PRESETS[0]);

  const faqs: Faq[] = [
    { q: "What is a SIP calculator?", a: "A SIP calculator estimates what a fixed monthly investment could be worth after a number of years at an assumed yearly return. This one also handles a yearly step-up and money you have already invested, and shows the result year by year." },
    { q: "How is SIP return calculated?", a: `Each month's instalment earns the monthly rate (the yearly rate ÷ 12) from the month it is invested. For a flat SIP that is FV = P × [(1 + i)^n − 1] ÷ i. For example, ${money(5000)} a month at 12% for 10 years comes to about ${money(flat.maturityValue)}, of which ${money(flat.investedAmount)} is your own money.` },
    { q: "What is a step-up SIP?", a: `A step-up SIP raises the monthly amount by a fixed percentage once a year, usually in line with a pay rise. Stepping ${money(5000)} up by 10% a year for 10 years at 12% gives about ${money(stepped.maturityValue)}, against ${money(flat.maturityValue)} without the step-up.` },
    { q: "What return should I assume?", a: "Use a rate you are comfortable planning around, not the best year you remember. The presets are starting points only: PPF, NPS and RD rates change, and equity fund returns vary from year to year. Trying a lower rate as well shows how much the answer depends on it." },
    { q: "Do I need to sign up to use it?", a: "No. The calculator is free, needs no account, and runs entirely in your browser; nothing you type is sent anywhere." },
    { q: "Are these returns guaranteed?", a: PROJECTION_DISCLAIMER },
  ];

  return (
    <ToolPageFrame>
      <ToolSchemas crumbs={crumbs} faqs={faqs} app={{ name: "Finnri SIP Calculator", description, path: "/tools/sip-calculator" }} />
      <ToolHero
        crumbs={crumbs}
        title={<>SIP <span className="text-ink-gradient">calculator</span></>}
        lead="See what a monthly SIP could grow to, with a yearly step-up and money you’ve already invested, and read the answer in lakh and crore."
        points={["Free, no sign-up", "Runs in your browser", "Year-by-year table"]}
      >
        <SipCalculator />
      </ToolHero>

      <section className="border-y border-border bg-card/40 py-16 lg:py-24">
        <div className={toolShell}>
          <SectionHeading eyebrow="How it works" title="The maths, in plain numbers." body="Every month’s instalment earns the yearly rate divided by 12, from the month it goes in. Here’s what that means with real figures." />
          <div className="grid gap-4 md:grid-cols-3">
            <article data-reveal className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">The formula</p>
              <p className="font-display mt-4 text-2xl font-bold">FV = P × [(1 + i)<sup>n</sup> − 1] ÷ i</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex gap-3"><dt className="w-6 font-bold">P</dt><dd className="text-muted">your monthly SIP</dd></div>
                <div className="flex gap-3"><dt className="w-6 font-bold">i</dt><dd className="text-muted">yearly return ÷ 12 ÷ 100</dd></div>
                <div className="flex gap-3"><dt className="w-6 font-bold">n</dt><dd className="text-muted">number of monthly instalments</dd></div>
              </dl>
            </article>
            <article data-reveal style={{ "--reveal-delay": "100ms" } as CSSProperties} className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">A worked example</p>
              <p className="mt-4 leading-relaxed text-muted">{money(5000)} a month for 10 years at 12% a year:</p>
              <p className="font-display mt-3 text-3xl font-bold tabular-nums">{money(flat.maturityValue)}</p>
              <p className="mt-2 text-sm text-muted">You put in {money(flat.investedAmount)}; the other {formatLakhCrore(flat.estimatedReturns)} is growth. Leave it for 20 years instead and it’s about {formatLakhCrore(longer.maturityValue)}.</p>
            </article>
            <article data-reveal style={{ "--reveal-delay": "200ms" } as CSSProperties} className="rounded-3xl border border-border bg-card p-6">
              <p className="text-sm font-bold text-eyebrow">Why step-up matters</p>
              <p className="mt-4 leading-relaxed text-muted">The same SIP, raised 10% every year:</p>
              <p className="font-display mt-3 text-3xl font-bold tabular-nums">{money(stepped.maturityValue)}</p>
              <p className="mt-2 text-sm text-muted">That’s {formatLakhCrore(stepped.maturityValue - flat.maturityValue)} more than the flat SIP, for {formatLakhCrore(stepped.investedAmount - flat.investedAmount)} more of your own money.</p>
            </article>
          </div>
        </div>
      </section>

      <FaqSection faqs={faqs} title="SIP calculator questions" />

      <section className="pb-16 lg:pb-24">
        <div className={toolShell}>
          <RelatedTool
            href="/tools/emi-calculator"
            title="EMI calculator"
            body="Taking a loan as well? See the monthly EMI and how much of it is interest."
            sample={`${money(emi.monthlyEMI)}/mo`}
            sampleLabel="₹30 lakh home loan, 8.5%, 20 years"
            icon={<Calculator className="h-6 w-6" />}
          />
        </div>
      </section>

      <AppCta title="Your SIP, your spends, one place." body="Finnri tracks day-to-day money by voice or text, shows your SIPs and EMIs before they’re due, and keeps it all without a bank login." />
    </ToolPageFrame>
  );
}
