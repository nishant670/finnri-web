import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import {
  ArrowRight,
  Calculator,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  Banknote,
  Landmark,
  Lock,
  MessageCircleQuestion,
  Mic,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import MarketingNav from "@/app/components/marketing/MarketingNav";
import HeroDemo from "@/app/components/marketing/HeroDemo";
import PhoneFrame from "@/app/components/marketing/PhoneFrame";
import PhraseShowcase from "@/app/components/marketing/PhraseShowcase";
import PlayBadge from "@/app/components/marketing/PlayBadge";
import ScrollReveal from "@/app/components/marketing/ScrollReveal";
import BrandMark from "@/app/components/ui/BrandMark";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { LEGAL_BUSINESS_NAME, MERCHANT_IDENTITY_PUBLISHED, PLAY_STORE_LISTED, PLAY_STORE_URL, SITE_URL } from "@/app/lib/site";
import { discountPercent, formatMinor } from "@/app/lib/billing-format";
import { fetchPublishedPrices, intervalDuration } from "@/app/lib/public-plans";
import { calculateEMI, calculateSIP, SIP_PRESETS } from "@/app/lib/calculators";
import { cn } from "@/app/lib/utils";

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
  title: "Finnri | Track expenses by just saying them — made for India",
  description: "Say or type what you spent — “250 for lunch on UPI” — and Finnri drafts the amount, category and account, then saves it only after you check. Free on Android and the web, with free SIP and EMI calculators.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Finnri | Track every rupee by just saying it",
    description: "Voice and text expense tracking for India that asks before it saves. UPI, cards, cash, splits with friends — no bank login.",
    url: SITE_URL,
    siteName: "Finnri",
    type: "website",
  },
};

// The plan list is read from the API for the same reason `/pricing` is: an
// owner can change prices from the admin console, and a retyped price is the
// one a visitor sees first.
export const revalidate = 3600;

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export default async function Home() {
  const { plans } = await fetchPublishedPrices();
  // The API attaches the same offer to every plan it covers, so any one of
  // them carries the label.
  const launchOffer = plans.find((plan) => plan.offer)?.offer ?? null;
  const sip = calculateSIP(SIP_PRESETS[0]);
  const emi = calculateEMI({ principalAmount: 1000000, annualInterestRatePercent: 9, tenureMonths: 240 });

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
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Finnri",
    operatingSystem: "ANDROID",
    applicationCategory: "FinanceApplication",
    installUrl: PLAY_STORE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
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

  const shell = "mx-auto max-w-6xl px-4 sm:px-6";
  const outlineButton = "inline-flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-border bg-card/70 px-5 text-[15px] font-bold backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-card hover:shadow-lg";
  const primaryButton = "inline-flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-6 text-[15px] font-bold text-on-accent shadow-[0_12px_30px_-12px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105";
  const headline = ["Track", "every", "rupee", "by", "just"];

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-body text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      {PLAY_STORE_LISTED && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <a href="#main-content" className="sr-only z-[100] rounded-xl bg-card px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <MarketingNav />
      <ScrollReveal />
      <main id="main-content">

      {/* Hero */}
      <section className="relative isolate pb-16 pt-24 sm:pt-28 lg:pb-24 lg:pt-36">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="bg-dot-field absolute inset-0" />
          <div className="absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full blur-[120px]" style={{ background: "var(--glow)" }} />
          <div className="absolute left-[-15%] top-1/3 h-[420px] w-[420px] rounded-full bg-fuchsia-400/10 blur-[110px]" />
        </div>

        <div className={`${shell} grid items-center gap-14 lg:max-w-7xl lg:grid-cols-[1.1fr_1fr]`}>
          <div className="max-w-2xl">
            <p className="rise-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1.5 pl-2 pr-3.5 text-sm font-semibold shadow-sm backdrop-blur">
              <span className="relative grid h-5 w-5 place-items-center rounded-full bg-accent/20">
                <span className="h-2 w-2 rounded-full bg-accent" />
              </span>
              Expense tracking for India · Android &amp; web
            </p>
            <h1 className="font-display mb-6 text-[44px] font-bold leading-[1.02] sm:text-6xl lg:text-[76px]">
              {headline.map((word, index) => (
                <span key={word} className="rise-in inline-block" style={{ "--delay": `${80 + index * 70}ms` } as CSSProperties}>{word}&nbsp;</span>
              ))}
              <span className="rise-in inline-block text-ink-gradient pb-1" style={{ "--delay": `${80 + headline.length * 70}ms` } as CSSProperties}>saying&nbsp;it.</span>
            </h1>
            <p className="rise-in mb-9 max-w-xl text-lg leading-relaxed text-muted sm:text-xl" style={{ "--delay": "520ms" } as CSSProperties}>
              Say or type it the way you’d text a friend — <span className="font-semibold text-foreground">“250 for lunch on UPI”</span>. Finnri fills in the amount, category and account, then waits for your OK before anything is saved.
            </p>

            <div className="rise-in flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--delay": "640ms" } as CSSProperties}>
              {PLAY_STORE_LISTED ? (
                <>
                  <PlayBadge className="self-start" />
                  {/* Same height and corners as the Play badge beside it. */}
                  <Link href="/login" className={cn("group self-start", outlineButton, "h-[60px] px-6")}>
                    Open the web dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </>
              ) : (
                <>
                  {/* With no public store listing, the dashboard is the way in. */}
                  <Link href="/login" className={`group ${primaryButton} self-start`}>
                    Open the web dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/tools" className={`${outlineButton} self-start`}>Try the free tools</Link>
                </>
              )}
            </div>
            {!PLAY_STORE_LISTED && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Smartphone className="h-4 w-4 shrink-0" />
                The Android app is in closed testing. The web dashboard is open to everyone today.
              </p>
            )}

            <ul className="rise-in mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted" style={{ "--delay": "760ms" } as CSSProperties}>
              {["Free to start", "No bank login", "Made for UPI, cards & cash"].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" strokeWidth={3} />{item}</li>
              ))}
            </ul>
          </div>

          <div className="rise-in relative flex justify-center lg:justify-end lg:pr-16" style={{ "--delay": "300ms" } as CSSProperties}>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* Say it like you'd text it */}
      <PhraseShowcase />

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 lg:py-28">
        <div className={shell}>
          <SectionIntro center eyebrow="How it works" title={<>From a sentence to a clean record <span className="text-ink-gradient">in seconds.</span></>} body="No forms to fill, no categories to hunt for. And because Finnri asks first, nothing wrong slips into your records." />
          <ol className="grid gap-5 md:grid-cols-3">
            <StepCard index={1} delay={0} title="Say it or type it" body="Tap the mic in the Android app, or type a quick note on your phone or the web. Plain words are enough.">
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="flex h-10 items-center gap-1" aria-hidden="true">
                  {[0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.5, 0.75].map((height, index) => (
                    <span key={index} className="wave-bar w-1.5 rounded-full bg-accent" style={{ height: `${height * 40}px`, animationDelay: `${index * -0.12}s` }} />
                  ))}
                </div>
                <span className="rounded-2xl rounded-bl-md bg-card px-3.5 py-2 text-sm font-medium shadow-sm ring-1 ring-border">“Uber 180 to office, card”</span>
              </div>
            </StepCard>
            <StepCard index={2} delay={120} title="Finnri drafts it" body="AI suggests the amount, category, account and date from what you said — the busywork, done.">
              <div className="mx-auto w-full max-w-[240px] space-y-1.5 text-sm">
                {[
                  ["Amount", "₹180"],
                  ["Category", "Transport"],
                  ["Paid via", "Card"],
                  ["Date", "Today"],
                ].map(([label, value], index) => (
                  <div key={label} data-reveal style={{ "--reveal-delay": `${300 + index * 120}ms` } as CSSProperties} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-border">
                    <span className="text-muted">{label}</span>
                    <span className="flex items-center gap-1.5 font-semibold"><Sparkles className="h-3.5 w-3.5 text-accent" />{value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
            <StepCard index={3} delay={240} title="You check, then save" body="Fix anything that’s off, then save. Only records you’ve confirmed count toward your totals and insights.">
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex w-full max-w-[240px] items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
                  <CategoryTile category="Transport" size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Uber</p>
                    <p className="text-xs text-muted">Transport · Card</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">−₹180</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/15 px-3 py-1 text-sm font-bold text-positive"><Check className="h-4 w-4" strokeWidth={3} /> Saved after your OK</span>
              </div>
            </StepCard>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 pb-20 lg:pb-28">
        <div className={shell}>
          <SectionIntro eyebrow="Features" title={<>Everything your money touches, <span className="text-ink-gradient">in one calm place.</span></>} body="Daily spends, bills that are due, trips with friends, the cards in your wallet — kept straight without spreadsheets." />
          <div className="grid gap-4 lg:grid-cols-3">
            <BentoCard className="lg:col-span-2" icon={Users} title="Split with friends, minus the awkward maths" body="Trips, flatmates and dinners in one place. See who owes whom and settle up. Invite anyone with a link.">
              <div className="mt-6 grid gap-3 sm:grid-cols-[1.1fr_1fr]">
                <div className="rounded-2xl bg-background p-4 ring-1 ring-border">
                  <p className="text-xs text-muted">Goa trip · 4 people</p>
                  <p className="mt-1 text-sm text-muted">You’re owed</p>
                  <p className="font-display text-3xl font-bold text-positive">₹8,850</p>
                  <div className="mt-3 space-y-1.5 text-sm">
                    {[["Aarav", 3150, "#F59E0B"], ["Priya", 2100, "#EC4899"], ["Rohan", 3600, "#6366F1"]].map(([name, amount, hue], index) => (
                      <div key={name as string} data-reveal style={{ "--reveal-delay": `${200 + index * 100}ms` } as CSSProperties} className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: hue as string }}>{(name as string)[0]}</span>
                        <span className="flex-1">{name} owes you</span>
                        <span className="font-semibold tabular-nums">{rupees(amount as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[["Villa stay", "You paid ₹12,000", "Bills"], ["Beach shack dinner", "You paid ₹2,400", "Food & Drinks"], ["Scooter rental", "Aarav paid ₹1,800", "Transport"]].map(([title, meta, category]) => (
                    <div key={title} className="flex items-center gap-2.5 rounded-xl bg-background p-2.5 ring-1 ring-border">
                      <CategoryTile category={category} size={30} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{title}</p>
                        <p className="truncate text-xs text-muted">{meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </BentoCard>

            <BentoCard icon={Camera} title="Scan a bill" body="Snap a receipt and Finnri reads the shop, total and date into a draft you check." delay={100}>
              <div className="relative mx-auto mt-6 h-44 w-36 overflow-hidden rounded-xl bg-white p-3 font-mono text-[9px] leading-relaxed text-zinc-600 shadow-lg ring-1 ring-black/5" aria-hidden="true">
                <p className="text-center text-[10px] font-bold text-zinc-900">FRESH BASKET</p>
                <p className="text-center">24 Oct 2026</p>
                <div className="my-1.5 border-t border-dashed border-zinc-300" />
                {[["Basmati rice", "420"], ["Toor dal", "180"], ["Tomatoes", "60"], ["Onions", "45"], ["Paneer", "120"]].map(([item, price]) => (
                  <p key={item} className="flex justify-between"><span>{item}</span><span>{price}</span></p>
                ))}
                <div className="my-1.5 border-t border-dashed border-zinc-300" />
                <p className="flex justify-between font-bold text-zinc-900"><span>TOTAL</span><span>₹825</span></p>
                <span className="scan-line absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-accent/35 to-transparent" />
              </div>
            </BentoCard>

            <BentoCard icon={CreditCard} title="Bills, EMIs and SIPs" body="Know what’s due before it’s due, and mark it paid in a tap." delay={0}>
              <ul className="mt-5 divide-y divide-border rounded-2xl bg-background text-sm ring-1 ring-border">
                {[["House rent", 22000, "Due tomorrow", "Bills"], ["Index fund SIP", 5000, "In 5 days", "Interest"], ["Phone EMI", 2499, "Due 10 Nov", "Shopping"]].map(([title, amount, due, category]) => (
                  <li key={title as string} className="flex items-center gap-2.5 px-3 py-2.5">
                    <CategoryTile category={category as string} size={28} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums">{rupees(amount as number)}</span>
                      <span className="block text-xs text-warning">{due}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </BentoCard>

            <BentoCard icon={Wallet} title="Every account, one view" body="Savings, cards, UPI and cash — labelled by you. Finnri never logs in to your bank." delay={100}>
              <div className="mt-5 flex flex-wrap gap-2">
                {[[Landmark, "Savings account"], [CreditCard, "Rewards credit card"], [Smartphone, "UPI"], [Banknote, "Cash"]].map(([Icon, label], index) => {
                  const Glyph = Icon as typeof Landmark;
                  return (
                    <span key={label as string} data-reveal="scale" style={{ "--reveal-delay": `${150 + index * 90}ms` } as CSSProperties} className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-sm font-semibold ring-1 ring-border">
                      <Glyph className="h-4 w-4 text-accent" />{label as string}
                    </span>
                  );
                })}
              </div>
            </BentoCard>

            <BentoCard icon={MessageCircleQuestion} title="Ask Finnri" body="Ask about your spending in plain words. Answers come from your own records." delay={200}>
              <div className="mt-5 space-y-2 text-sm">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 font-medium text-on-accent">Where did my money go this month?</p>
                <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-background px-3.5 py-2.5 ring-1 ring-border">
                  <p className="font-display text-xl font-bold">₹50,957</p>
                  <p className="text-xs text-muted">Bills took 47% — rent was the biggest single spend.</p>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="lg:col-span-2" icon={TrendingUp} title="Insights and budgets" tag="With a pass" body="Trends, unusual spends and category budgets, worked out only from records you’ve confirmed — so the numbers are ones you trust." delay={0}>
              <div className="mt-6 flex items-end gap-2 sm:gap-3" aria-hidden="true">
                {[22, 34, 28, 46, 38, 30, 52, 44, 36, 64, 58, 80].map((height, index) => (
                  <span key={index} className="grow-y flex-1 rounded-t-lg" style={{ height: `${height * 1.4}px`, background: index === 11 ? "var(--accent)" : "var(--bar-dim)", "--grow-delay": `${200 + index * 50}ms` } as CSSProperties} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">Spending by month</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/15 px-3 py-1 font-semibold text-positive"><Check className="h-3.5 w-3.5" strokeWidth={3} /> On track — surplus ₹45,523</span>
              </div>
            </BentoCard>

            <BentoCard icon={Sparkles} title="Make it yours" body="Four moods — Finnri, Mint, Sky and Plum — each in light or dark. Try them on the phone up top." delay={100}>
              <div className="mt-6 grid grid-cols-4 gap-2" aria-hidden="true">
                {[["#FF8865", "#FDF5F7"], ["#17A978", "#F3FBF7"], ["#1F6FD6", "#F4F9FE"], ["#8B3FD9", "#FCF6FD"]].map(([accent, surface], index) => (
                  <span key={accent} data-reveal="scale" style={{ "--reveal-delay": `${150 + index * 90}ms`, background: surface } as CSSProperties} className="flex aspect-[3/4] flex-col justify-end gap-1 rounded-xl p-2 ring-1 ring-black/5">
                    <span className="h-1.5 w-3/4 rounded-full bg-black/10" />
                    <span className="h-5 rounded-md" style={{ background: accent }} />
                  </span>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* Real screens */}
      <section className="relative isolate overflow-hidden py-20 lg:py-28">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-[480px] max-w-4xl -translate-y-1/2 rounded-full bg-sky-400/15 blur-[120px]" />
        <div className={shell}>
          <SectionIntro center eyebrow="Inside the app" title="Real screens. Real calm." body="Straight from the Android app — here in the Sky mood — with the demo account we use for screenshots." />
          <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6 [scrollbar-width:none] lg:mx-0 lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0">
            {[
              { src: "/screens/app-money.webp", caption: "Know what’s due before it’s due", alt: "Finnri's Money tab: ₹56,045 due in the next 30 days, listing cloud storage, house rent, a music subscription, a credit card bill, an index fund SIP, a phone EMI and video streaming with their due dates", reveal: "fan-left", tilt: "lg:-rotate-6 lg:translate-y-10", place: "lg:-mr-4" },
              { src: "/screens/app-insights.webp", caption: "See where it went", alt: "Finnri's Insights for October 2026: ₹91,357 tracked across 41 transactions, a monthly bar chart, an unusual-spending alert and an On track card with ₹97,000 income, ₹51,477 spent and a ₹45,523 surplus", reveal: "up", tilt: "lg:scale-105", place: "lg:relative lg:z-10" },
              { src: "/screens/app-splits.webp", caption: "Settle trips and flatmates", alt: "A Goa trip split group in Finnri: you're owed ₹8,850 — Aarav owes ₹3,150, Priya ₹2,100 and Rohan ₹3,600 — above the trip's expenses", reveal: "fan-right", tilt: "lg:rotate-6 lg:translate-y-10", place: "lg:-ml-4" },
            ].map((screen) => (
              <figure key={screen.src} data-reveal={screen.reveal} className={`w-[250px] shrink-0 snap-center sm:w-[270px] ${screen.place}`}>
                <PhoneFrame className={screen.tilt} screenStyle={{ background: "#F4F9FE" }}>
                  <div className="absolute inset-x-0 bottom-0 top-8">
                    <Image src={screen.src} alt={screen.alt} fill sizes="270px" className="object-cover object-top" />
                  </div>
                </PhoneFrame>
                <figcaption className="mt-5 text-center text-sm font-semibold lg:mt-16">{screen.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Web dashboard */}
      <section className="py-20 lg:py-28">
        <div className={`${shell} grid items-center gap-12 lg:grid-cols-[0.9fr_1.2fr]`}>
          <div data-reveal>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">Web dashboard</p>
            <h2 className="font-display mb-5 text-4xl font-bold leading-[1.05] lg:text-5xl">Your money, on the big screen.</h2>
            <p className="mb-7 text-lg leading-relaxed text-muted">Spot patterns, tidy up records and plan ahead with room to think. Everything you log on the phone is already there.</p>
            <ul className="mb-8 space-y-3.5 font-medium">
              {["Interactive reports and spending trends", "Search, filter and export any transaction view", "Split groups, budgets, subscriptions and planning tools"].map((item) => (
                <li key={item} className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><Check className="h-3 w-3" strokeWidth={3.5} /></span>{item}</li>
              ))}
            </ul>
            <Link href="/login" className={`group ${primaryButton}`}>
              Open the web dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {/* A real /dashboard capture, with demo data. */}
          <div data-reveal="tilt" className="relative">
            <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[3rem] blur-3xl" style={{ background: "var(--glow)" }} />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35)]">
              <div className="flex h-9 items-center gap-1.5 border-b border-border bg-track px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <span className="mx-auto flex h-5 items-center gap-1.5 rounded-md bg-card px-3 text-[11px] text-muted"><Lock className="h-3 w-3" />finnri.app/dashboard</span>
              </div>
              <div className="relative aspect-[16/10]">
                <Image
                  src="/dashboard-overview.webp"
                  alt="The Finnri web dashboard Overview for the last 30 days: ₹28,798 spent, ₹1,07,000 income and ₹78,202 net cash flow, with an unusual-spending insight below"
                  fill
                  sizes="(min-width: 1024px) 640px, 92vw"
                  className="object-cover object-left-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free tools */}
      <section className="pb-20 lg:pb-28">
        <div className={shell}>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            <div data-reveal className="flex flex-col justify-center md:pr-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">Free tools</p>
              <h2 className="font-display text-3xl font-bold leading-[1.08] lg:text-4xl">Plan the big numbers, free.</h2>
              <p className="mt-4 leading-relaxed text-muted">SIP and EMI calculators with year-by-year tables. No sign-up, no catch.</p>
            </div>
            <Link href="/tools" data-reveal style={{ "--reveal-delay": "100ms" } as CSSProperties} className="group rounded-3xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <span className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-selected text-accent"><TrendingUp className="h-5 w-5" /></span><ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-foreground" /></span>
              <p className="mt-5 font-bold">SIP calculator</p>
              <p className="mt-1 text-sm text-muted">₹10,000 a month for 10 years at 12%, stepping up 10% a year</p>
              <p className="font-display mt-4 text-3xl font-bold tabular-nums">{rupees(sip.maturityValue)}</p>
              <p className="text-xs text-muted">estimated value · you put in {rupees(sip.investedAmount)}</p>
            </Link>
            <Link href="/tools" data-reveal style={{ "--reveal-delay": "200ms" } as CSSProperties} className="group rounded-3xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <span className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-selected text-accent"><Calculator className="h-5 w-5" /></span><ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-foreground" /></span>
              <p className="mt-5 font-bold">EMI calculator</p>
              <p className="mt-1 text-sm text-muted">A ₹10 lakh loan at 9% for 20 years</p>
              <p className="font-display mt-4 text-3xl font-bold tabular-nums">{rupees(emi.monthlyEMI)}<span className="text-base font-semibold text-muted"> /month</span></p>
              <p className="text-xs text-muted">{rupees(emi.totalInterest)} in interest over the loan</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-20 px-4 sm:px-6">
        <div data-reveal="scale" className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-14 text-white ring-1 ring-white/10 sm:px-12 lg:py-20">
          <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-accent/25 blur-[100px]" />
          <div aria-hidden="true" className="absolute -bottom-32 left-10 -z-10 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[100px]" />
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ShieldCheck className="h-7 w-7 text-accent" /></span>
              <h2 className="font-display mt-6 text-4xl font-bold leading-[1.05] lg:text-5xl">Your records stay yours.</h2>
              <p className="mt-4 max-w-md leading-relaxed text-white/70">Finnri only knows what you choose to tell it — and keeps it that way.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Landmark, title: "No bank login, ever", desc: "Finnri never connects to your bank. You add records by voice, text or tap." },
                { icon: Lock, title: "Encrypted in transit and at rest", desc: "Connections and stored records are protected with encryption." },
                { icon: ShieldCheck, title: "Never sold", desc: "We don’t sell your financial data to anyone." },
                { icon: Trash2, title: "Leave any time", desc: "Export to CSV, or delete your account and its data from the app or the web." },
              ].map((item, index) => (
                <li key={item.title} data-reveal style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                  <item.icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-3 font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 lg:py-28">
        <div className={shell}>
          <SectionIntro center eyebrow="Pricing" title="Start free. Pay only when you want more." body="Passes are a one-time payment for a fixed period. Nothing renews on its own." />

          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_1.15fr]">
            <div data-reveal className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7">
              <div>
                <h3 className="text-xl font-bold">Finnri Free</h3>
                <p className="mt-1 text-muted">Everything you need to track money yourself.</p>
                <p className="mb-6 mt-5 flex items-baseline gap-2"><span className="font-display text-5xl font-bold">₹0</span><span className="text-sm text-muted">no card needed</span></p>
                <ul className="mb-7 space-y-3">
                  {[
                    "Unlimited manual transactions and accounts",
                    "Search, filters, and dashboard totals",
                    "Split groups with friends",
                    "CSV export of transaction views",
                    // LoggedInFreeTrialCredits and TrialDuration in the API's
                    // internal/billing/credits.go.
                    "1,000 AI credits for your first 30 days",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-medium"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} />{item}</li>
                  ))}
                </ul>
              </div>
              <Link href="/login" className={outlineButton}>Get started free</Link>
            </div>

            <div data-reveal style={{ "--reveal-delay": "120ms" } as CSSProperties} className="relative flex flex-col justify-between rounded-3xl bg-card p-7 shadow-[0_30px_60px_-30px_var(--accent)] ring-2 ring-accent/60">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-xl font-bold">Paid passes</h3>
                  {launchOffer && (
                    <span className="rounded-full bg-gradient-to-r from-[var(--ink-from)] to-[var(--ink-to)] px-3 py-1 text-xs font-bold text-white shadow-sm">{launchOffer.label}</span>
                  )}
                </div>
                <p className="mt-1 text-muted">More AI credits, plus budgets, insights, weekly reviews and subscription reminders.</p>
                <ul className="mt-5 divide-y divide-border rounded-2xl bg-background px-4 ring-1 ring-border">
                  {plans.map((plan) => {
                    const charged = plan.offer?.price_minor ?? plan.price_minor ?? 0;
                    const crossedOut = plan.offer ? plan.offer.original_price_minor : (discountPercent(plan) != null ? plan.list_price_minor : null);
                    return (
                      <li key={plan.code} className="flex items-center justify-between gap-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-bold">{plan.name}</p>
                          <p className="text-sm text-muted">{intervalDuration(plan.billing_interval)} · {plan.included_credits.toLocaleString("en-IN")} AI credits</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-2xl font-bold tabular-nums">{formatMinor(charged, plan.currency)}</p>
                          {crossedOut != null && (
                            <p className="text-sm text-muted"><s>{formatMinor(crossedOut, plan.currency)}</s></p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-6">
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
      <section className="pb-20 lg:pb-28">
        <div className={`${shell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div data-reveal>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">Questions</p>
            <h2 className="font-display text-4xl font-bold leading-[1.05] lg:text-5xl">Questions, answered.</h2>
            <p className="mt-4 text-muted">Something else on your mind? <a href="mailto:support@finnri.app?subject=Finnri%20Support" className="font-semibold text-foreground underline underline-offset-4">Write to support@finnri.app</a></p>
          </div>
          <div data-reveal style={{ "--reveal-delay": "100ms" } as CSSProperties} className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-border bg-card px-5 transition-colors open:shadow-sm">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-track transition-transform duration-300 group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span>
                </summary>
                <p className="disclosure-enter pb-5 leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section id="get-started" className="px-4 pb-20 sm:px-6 lg:pb-28">
        <div data-reveal="scale" className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-accent px-6 py-16 text-center text-[#2D2D2D] lg:py-24">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(224,70,95,0.45),transparent_50%)]" />
          <div aria-hidden="true" className="absolute -left-10 top-10 -z-10 opacity-25">
            <Mic className="h-40 w-40 -rotate-12" strokeWidth={1} />
          </div>
          <h2 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">Your next expense takes five seconds.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#2D2D2D]/80">Free to start. Sign in with Google, or try it as a guest — no sign-up needed.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {PLAY_STORE_LISTED && <PlayBadge />}
            <Link href="/login" className="group inline-flex h-[60px] items-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-bold text-zinc-950 shadow-xl transition duration-300 hover:-translate-y-0.5">
              Open the web dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      </main>

      <footer className="border-t border-border py-14">
        <div className={`${shell} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
          <div>
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">Day-to-day money tracking for India, by voice, text or tap — saved only when you say so.</p>
            {PLAY_STORE_LISTED && <PlayBadge size="md" className="mt-5" />}
          </div>
          <FooterColumn title="Product" links={[["#features", "Features"], ["#pricing", "Pricing"], ["/tools", "SIP & EMI calculators"], ["/login", "Web dashboard"]]} />
          <FooterColumn title="Policies" links={[["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/refunds", "Refunds"], ["/shipping", "Digital delivery"]]} />
          <FooterColumn title="Support" links={[
            ["mailto:support@finnri.app?subject=Finnri%20Support", "Contact Support"],
            ...(MERCHANT_IDENTITY_PUBLISHED ? [["/contact", "Contact"] as [string, string]] : []),
            ["/pricing", "Pricing details"],
            ["/delete-account", "Delete Account"],
          ]} />
        </div>
        <p className={`${shell} mt-12 text-sm text-muted`}>© 2026 Finnri · Made in India.</p>
      </footer>
    </div>
  );
}

/** A section's eyebrow, heading and lead line. */
function SectionIntro({ eyebrow, title, body, center = false }: { eyebrow: string; title: ReactNode; body?: string; center?: boolean }) {
  return (
    <div data-reveal className={`mb-12 max-w-3xl lg:mb-16 ${center ? "mx-auto text-center" : ""}`}>
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">{eyebrow}</p>
      <h2 className="font-display text-balance text-4xl font-bold leading-[1.05] lg:text-[56px]">{title}</h2>
      {body ? <p className={`mt-5 text-lg leading-relaxed text-muted ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{body}</p> : null}
    </div>
  );
}

function StepCard({ index, title, body, delay, children }: { index: number; title: string; body: string; delay: number; children: ReactNode }) {
  return (
    <li data-reveal style={{ "--reveal-delay": `${delay}ms` } as CSSProperties} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative h-52 bg-gradient-to-b from-selected/70 to-transparent p-6">{children}</div>
      <div className="p-6 pt-2">
        <span className="font-display text-sm font-bold text-eyebrow">0{index}</span>
        <h3 className="mt-1 text-xl font-bold">{title}</h3>
        <p className="mt-2 leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}

function BentoCard({ icon: Icon, title, body, tag, className = "", delay = 0, children }: { icon: typeof Users; title: string; body: string; tag?: string; className?: string; delay?: number; children: ReactNode }) {
  return (
    <div data-reveal style={{ "--reveal-delay": `${delay}ms` } as CSSProperties} className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-xl sm:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-selected text-accent transition-transform duration-300 group-hover:scale-110"><Icon className="h-5 w-5" strokeWidth={2} /></span>
        {tag ? <span className="rounded-full bg-track px-2.5 py-1 text-xs font-semibold text-muted">{tag}</span> : null}
      </div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-2 max-w-md leading-relaxed text-muted">{body}</p>
      {children}
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title}>
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("/") || href.startsWith("#") ? <Link href={href} className="transition-colors hover:text-foreground">{label}</Link> : <a href={href} className="transition-colors hover:text-foreground">{label}</a>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
