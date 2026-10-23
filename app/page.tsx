import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Landmark,
  LayoutDashboard,
  Lock,
  Mic,
  PieChart,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import MarketingNav from "@/app/components/marketing/MarketingNav";
import { LEGAL_BUSINESS_NAME, MERCHANT_IDENTITY_PUBLISHED, PLAY_STORE_LISTED, PLAY_STORE_URL, SITE_URL } from "@/app/lib/site";
import { discountPercent, formatMinor } from "@/app/lib/billing-format";
import { fetchPublishedPrices, intervalDuration } from "@/app/lib/public-plans";

const faqs = [
  { q: "Do I need to connect my bank?", a: "No. Finnri never connects to your bank. You add transactions yourself — by voice, text or tap — so you decide exactly what’s tracked." },
  { q: "How does voice input work?", a: "In the app, tap the mic and say it the way you’d tell a friend — “250 for lunch on UPI”. Finnri turns it into a draft and waits for you to check it before anything is saved." },
  { q: "What happens to voice and text drafts?", a: "Your voice is kept only long enough to turn it into text. Drafts you don’t save aren’t stored. When you do save a transaction, the words you used can stay with it, so you can always see where it came from." },
  { q: "Can I export my data?", a: "Yes. Export any transaction view from the web dashboard as a CSV file, on the free plan or a paid pass." },
  { q: "Is Finnri free?", a: "Yes. Tracking, accounts, search, splits with friends and CSV export are free. Signing in with Google adds 1,000 AI credits to use over your first 30 days. Paid passes add more AI credits plus budgets, insights and subscription reminders." },
  { q: "Do paid passes renew automatically?", a: "No. Every pass is a one-time payment for a fixed period: 7, 30, 90 or 365 days. Nothing is debited again unless you choose to buy another pass." },
  { q: "Is there an iPhone app?", a: "Not yet. Finnri is Android-first, and the web dashboard works in any browser, including on an iPhone." },
];

export const metadata: Metadata = {
  title: "Finnri | Confirm-first money tracking for India",
  description: "Record expenses and income, review AI-suggested details, understand confirmed spending, and use free EMI and SIP calculators.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Finnri | Money clarity from records you confirm",
    description: "Track day-to-day money and understand confirmed spending with Finnri.",
    url: SITE_URL,
    siteName: "Finnri",
    type: "website",
  },
};

// The plan list is read from the API for the same reason `/pricing` is: an
// owner can change prices from the admin console, and a retyped price is the
// one a visitor sees first.
export const revalidate = 3600;

export default async function Home() {
  const { plans } = await fetchPublishedPrices();
  // The API attaches the same offer to every plan it covers, so any one of
  // them carries the label.
  const launchOffer = plans.find((plan) => plan.offer)?.offer ?? null;
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Finnri",
    // Structured data is not passed through `metadataBase`, so this URL has to
    // be absolute here or it ships to crawlers as the literal string "/".
    url: SITE_URL,
    description: "Confirm-first money tracking and financial planning tools for India.",
    potentialAction: {
      "@type": "UseAction",
      target: `${SITE_URL}/tools`,
      name: "Use Finnri's free EMI and SIP calculators",
    },
  };
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: LEGAL_BUSINESS_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/finnri-logo.png`,
    email: "support@finnri.app",
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const steps = [
    { title: "Speak or type", desc: "On mobile, speak a transaction; on mobile or web, type a quick note or use the manual form." },
    { title: "AI extracts details", desc: "AI can suggest the amount, merchant, category, account, and date from what you entered." },
    { title: "You confirm & save", desc: "Check the draft, correct anything that is wrong, then save the confirmed record to your ledger." },
  ];
  const features = [
    { icon: Mic, title: "Voice-first tracking", desc: "Use mobile voice capture when it is convenient, with a review step before saving." },
    { icon: PieChart, title: "Smart categories", desc: "AI suggests a category from Finnri's shared list; you can correct it before saving." },
    { icon: Wallet, title: "All your accounts", desc: "Label cash, bank, wallet, UPI, and card accounts you maintain yourself. Finnri does not connect to banks." },
    { icon: TrendingUp, title: "Budgets & insights", desc: "Set category budgets and see trends and unusual spending, calculated from the transactions you have confirmed." },
    { icon: Users, title: "Split with friends", desc: "Share trips, flatmates and dinners in a group, see who owes whom, and settle up. Invite anyone with a link." },
    { icon: LayoutDashboard, title: "Web dashboard", desc: "Review explainable insights, accounts, transactions, and planning tools on the big screen." },
  ];
  const everyday = [
    "Track UPI spending",
    "Label credit card expenses",
    "Set category budgets",
    "Split rent and trips with friends",
    "Separate freelance records with tags",
  ];
  const security = [
    { icon: Lock, title: "Your data stays private", desc: "We never sell your financial data to third parties." },
    { icon: ShieldCheck, title: "Encrypted in transit and at rest", desc: "Production connections and stored records are protected with encryption." },
    { icon: Landmark, title: "No bank connection", desc: "Finnri does not connect to your bank. You add records by voice, text, or manual entry." },
  ];

  const primaryButton = "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-[15px] font-bold text-on-accent transition hover:brightness-105";
  const outlineButton = "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-6 text-[15px] font-bold transition hover:bg-track";
  const shell = "mx-auto max-w-6xl px-4 sm:px-6";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <a href="#main-content" className="sr-only z-[100] rounded-xl bg-card px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <MarketingNav />
      <main id="main-content">

      {/* Hero (boards R9-Site, R9-SiteM) */}
      <section className="pb-16 pt-24 lg:pb-24 lg:pt-32">
        <div className={`${shell} grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]`}>
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold">
              <Brain className="h-4 w-4 text-accent" />
              AI that asks before it saves
            </span>
            {/* text-balance keeps the two lines even rather than stranding
                "clarity." alone on the last one. */}
            <h1 className="mb-5 text-balance text-[40px] font-bold leading-[1.1] tracking-tight font-rounded sm:text-5xl lg:text-6xl">
              Track your money in India <span className="text-eyebrow">with clarity.</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted">
              Log what you spend by voice, text or tap. Finnri fills in the details, and nothing is saved until you’ve had a look.
            </p>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {PLAY_STORE_LISTED && (
                <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className={primaryButton}>
                  <Smartphone className="h-5 w-5" />
                  Get the Android app
                </a>
              )}
              {/* With no public store listing, the dashboard is the way in, so
                  it takes the primary styling the Play button would have had. */}
              <Link href="/login" className={`group ${PLAY_STORE_LISTED ? outlineButton : primaryButton}`}>
                Open the web dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/tools" className={outlineButton}>
                Try the free tools
              </Link>
            </div>

            {!PLAY_STORE_LISTED && (
              <p className="mb-6 flex items-center gap-2 text-sm text-muted">
                <Smartphone className="h-4 w-4 shrink-0" />
                The Android app is in closed testing. The web dashboard is open to everyone today.
              </p>
            )}

            <ul className="flex flex-col gap-2 text-sm font-medium sm:flex-row sm:flex-wrap sm:gap-x-6">
              {["No spreadsheets", "Designed for India (UPI, cards)", "Confirm-first AI"].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" strokeWidth={2.5} />{item}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center">
            {/* The real Android app's Home screen, no device frame: launch is
                Android-only, and an iPhone render showed a phone visitors could
                not install on. Demo data, not a real user's. */}
            <div className="relative aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl">
              <Image
                src="/hero-app-home.webp"
                alt="Finnri's Home screen: October spending so far, ₹8,140, with Food & Drinks as the biggest category, above the tap-and-speak button for logging an expense by voice"
                fill
                sizes="(min-width: 1024px) 340px, 90vw"
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-16 lg:py-20">
        <div className={shell}>
          <SectionIntro eyebrow="How it works" title="Log a spend in three steps" body="Say it, type it or tap it in — then check it before it’s saved." />
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-track text-base font-bold">{index + 1}</span>
                <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                <p className="leading-relaxed text-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16 lg:py-20">
        <div className={shell}>
          <SectionIntro eyebrow="Features" title="Everything you need, nothing you don’t" body="Simple tools for everyday money, and a clear view of where it goes." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-selected text-accent"><feature.icon className="h-5 w-5" strokeWidth={1.8} /></span>
                <div>
                  <h3 className="mb-1 font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everyday records */}
      <section className="py-16 lg:py-20">
        <div className={`${shell} grid gap-8 lg:grid-cols-2 lg:items-end`}>
          <div>
            <p className="mb-2 text-sm font-bold text-eyebrow">Everyday records</p>
            <h2 className="text-3xl font-bold leading-tight font-rounded lg:text-4xl">Built around everyday records.</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted">See what you spend by category and by shop — from the transactions you’ve checked.</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {everyday.map((item) => (
              <li key={item} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold"><Check className="h-4 w-4 text-accent" strokeWidth={2.5} />{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Web dashboard */}
      <section className="py-16 lg:py-20">
        <div className={`${shell} grid items-center gap-10 lg:grid-cols-2`}>
          <div>
            <p className="mb-2 text-sm font-bold text-eyebrow">Web dashboard</p>
            <h2 className="mb-4 text-3xl font-bold leading-tight font-rounded lg:text-4xl">Analyse on the big screen.</h2>
            <p className="mb-6 text-lg leading-relaxed text-muted">
              Some things are easier on a big screen. Spot patterns, tidy up records and plan ahead on the web dashboard.
            </p>
            <ul className="mb-6 space-y-3 font-medium">
              {["View interactive reports & spending trends", "Search, filter, inspect, and export transaction views", "Manage split groups, budgets, subscriptions, and planning tools"].map((item) => (
                <li key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />{item}</li>
              ))}
            </ul>
            <Link href="/tools" className="inline-flex items-center gap-1 font-bold hover:underline">Try the free tools <ChevronRight className="h-4 w-4" /></Link>
          </div>
          {/* A real /dashboard capture, with demo data. */}
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <Image
              src="/dashboard-overview.webp"
              alt="The Finnri web dashboard Overview for the last 30 days: ₹28,798 spent, ₹1,07,000 income and ₹78,202 net cash flow, with an unusual-spending insight below"
              fill
              sizes="(min-width: 1024px) 560px, 90vw"
              className="object-cover object-left-top"
            />
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-20 py-16 lg:py-20">
        <div className={shell}>
          <SectionIntro eyebrow="Security" title="Clear data boundaries. Privacy by design." />
          <ul className="grid gap-6 md:grid-cols-3">
            {security.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-selected text-accent"><item.icon className="h-5 w-5" strokeWidth={1.8} /></span>
                <div>
                  <h3 className="mb-1 font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-16 lg:py-20">
        <div className={shell}>
          <SectionIntro eyebrow="Pricing" title="Simple, fixed-price passes" body="Start free. When you want more AI capture and the paid features, buy a pass for as long as you need it. It never renews on its own." />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-xl font-bold">Finnri Free</h3>
                <p className="mt-1 text-muted">Everything you need to track money yourself.</p>
                <p className="mb-5 mt-4 flex items-baseline gap-2"><span className="text-4xl font-bold font-rounded">₹0</span><span className="text-sm text-muted">no card needed</span></p>
                <ul className="mb-6 space-y-2.5">
                  {[
                    "Unlimited manual transactions and accounts",
                    "Search, filters, and dashboard totals",
                    "Split groups with friends",
                    "CSV export of transaction views",
                    // LoggedInFreeTrialCredits and TrialDuration in the API's
                    // internal/billing/credits.go.
                    "1,000 AI credits for your first 30 days",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-medium"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />{item}</li>
                  ))}
                </ul>
              </div>
              <Link href="/login" className={outlineButton}>Get started free</Link>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-accent/50 bg-card p-6">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">Paid passes</h3>
                  {launchOffer && (
                    <span className="rounded-full bg-selected px-3 py-1 text-xs font-bold">{launchOffer.label}</span>
                  )}
                </div>
                <p className="mt-1 text-muted">More AI credits, plus budgets, insights, weekly reviews and subscription reminders.</p>
                <ul className="mt-4 divide-y divide-border">
                  {plans.map((plan) => {
                    const charged = plan.offer?.price_minor ?? plan.price_minor ?? 0;
                    const crossedOut = plan.offer ? plan.offer.original_price_minor : (discountPercent(plan) != null ? plan.list_price_minor : null);
                    return (
                      <li key={plan.code} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="font-bold">{plan.name}</p>
                          <p className="text-sm text-muted">{intervalDuration(plan.billing_interval)} · {plan.included_credits.toLocaleString("en-IN")} AI credits</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-bold tabular-nums">{formatMinor(charged, plan.currency)}</p>
                          {crossedOut != null && (
                            <p className="text-sm text-muted"><s>{formatMinor(crossedOut, plan.currency)}</s></p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-5">
                <Link href="/dashboard/billing" className={`${primaryButton} w-full`}>Choose a pass</Link>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {launchOffer ? "Launch price is for your first pass, while the offer lasts. " : ""}
                  One-time payment in INR via Razorpay. No auto-renewal. The exact amount is shown again before you pay.{" "}
                  <Link href="/pricing" className="font-bold text-foreground underline">Pricing details</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20">
        <div className={shell}>
          <SectionIntro eyebrow="Questions" title="Questions, answered" />
          <div className="max-w-3xl divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section id="get-started" className="py-16 lg:py-20">
        <div className={shell}>
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center lg:py-16">
            <h2 className="mb-3 text-3xl font-bold font-rounded lg:text-4xl">Start with Finnri on the web.</h2>
            <p className="mx-auto mb-8 max-w-xl text-muted">Sign in, or try it as a guest — no sign-up needed.</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className={`group ${primaryButton}`}>
                Open the web dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/tools" className={outlineButton}>Try the free tools</Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className={`${shell} flex flex-col gap-5 md:flex-row md:items-center md:justify-between`}>
          <p className="text-sm text-muted">© 2026 Finnri · Built for day-to-day money tracking in India.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/refunds" className="hover:text-foreground">Refunds</Link>
            <Link href="/shipping" className="hover:text-foreground">Digital delivery</Link>
            {MERCHANT_IDENTITY_PUBLISHED && <Link href="/contact" className="hover:text-foreground">Contact</Link>}
            <Link href="/delete-account" className="hover:text-foreground">Delete Account</Link>
            <a href="mailto:support@finnri.app?subject=Finnri%20Support" className="hover:text-foreground">Contact Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** A section's eyebrow, heading and lead line, left-aligned as the boards draw them. */
function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-2 text-sm font-bold text-eyebrow">{eyebrow}</p>
      <h2 className="text-3xl font-bold leading-tight font-rounded lg:text-4xl">{title}</h2>
      {body ? <p className="mt-3 leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}
