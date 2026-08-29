import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Mic,
  Brain,
  ShieldCheck,
  LayoutDashboard,
  PieChart,
  ArrowRight,
  CheckCircle2,
  Wallet,
  CreditCard,
  TrendingUp,
  Smartphone,
  ArrowDownRight
} from "lucide-react";
import MarketingNav from "@/app/components/marketing/MarketingNav";
import { SITE_URL } from "@/app/lib/site";

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

export default function Home() {
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-accent-secondary text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <Brain className="w-4 h-4" />
                <span>Confirm-first AI Intelligence</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] font-rounded">
                Money, made <span className="text-accent underline decoration-accent/20 underline-offset-8">intelligent.</span>
              </h1>
              <p className="text-xl text-text-muted mb-10 leading-relaxed max-w-lg">
                Record expenses and income by voice, text, or manual entry. Finnri can suggest the details; you review every record before it is saved.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/login" className="flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-foreground/10 group">
                  <LayoutDashboard className="w-5 h-5" />
                  Open Web Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/tools" className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-border px-8 py-4 rounded-2xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-md">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Explore Free Tools
                </Link>
              </div>

              <div className="flex flex-wrap gap-8 items-center border-t border-border pt-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">No spreadsheets</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">Designed for India (UPI, cards)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">Confirm-first AI</span>
                </div>
              </div>
            </div>

            <div className="relative lg:h-[600px] flex justify-center items-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 blur-[100px] rounded-full" />
              <div className="relative w-full max-w-[450px] aspect-[4/5] animate-float">
                <Image
                  src="/hero.png"
                  alt="Finnri App Interface"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-accent-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 font-rounded">Effortless Tracking in 3 Steps</h2>
            <p className="text-text-muted">Choose the capture method that suits the moment, then confirm the record before it reaches your ledger.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Mic className="w-8 h-8" />,
                title: "Speak or type",
                desc: "On mobile, speak a transaction; on mobile or web, type a quick note or use the manual form."
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI extracts details",
                desc: "AI can suggest the amount, merchant, category, account, and date from what you entered."
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "You confirm & save",
                desc: "Check the draft, correct anything that is wrong, then save the confirmed record to your ledger."
              }
            ].map((step, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 p-8 rounded-panel shadow-sm hover:shadow-xl transition-all border border-border group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 text-accent/10 font-bold text-6xl group-hover:text-accent/20 transition-colors">
                  0{i + 1}
                </div>
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 font-rounded">Powerful Features, Zero Clutter</h2>
            <p className="text-text-muted">Practical tools for recording day-to-day money and understanding confirmed transactions.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Mic className="w-6 h-6" />,
                title: "Voice-first Tracking",
                desc: "Use mobile voice capture when it is convenient, with a review step before saving."
              },
              {
                icon: <PieChart className="w-6 h-6" />,
                title: "Smart Categorization",
                desc: "AI suggests a category from Finnri's shared list; you can correct it before saving."
              },
              {
                icon: <Wallet className="w-6 h-6" />,
                title: "Multi-Account Tracking",
                desc: "Label cash, bank, wallet, UPI, and card accounts you maintain yourself. Finnri does not connect to banks."
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Insights & Trends",
                desc: "Compare totals and patterns calculated from the transactions you have confirmed."
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Confirm-first Trust",
                desc: "AI suggests, you decide. Full control over what gets saved."
              },
              {
                icon: <LayoutDashboard className="w-6 h-6" />,
                title: "Web Dashboard",
                desc: "Review explainable insights, accounts, transactions, and planning tools on the big screen."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-panel border border-border hover:border-accent/40 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-all">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-text-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-zinc-900 text-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-8 font-rounded leading-tight">Built around everyday records.</h2>
              <div className="space-y-6">
                {[
                  { title: "Track UPI spending", icon: <Smartphone className="text-accent" /> },
                  { title: "Label credit card expenses", icon: <CreditCard className="text-accent" /> },
                  { title: "Set category budgets", icon: <Wallet className="text-accent" /> },
                  { title: "Separate freelance records with tags", icon: <TrendingUp className="text-accent" /> }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors border border-white/10">
                    <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
                      {item.icon}
                    </div>
                    <span className="text-lg font-medium">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square bg-gradient-to-br from-accent/20 to-transparent rounded-panel border border-white/10 p-12 flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 animate-float">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase tracking-widest text-zinc-400">Monthly Budget</span>
                    <span className="text-accent text-sm font-bold">75% Used</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-accent w-[75%]" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl space-y-4 translate-x-12 dark:bg-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center dark:bg-zinc-700">🛒</div>
                      <div>
                        <p className="text-zinc-900 font-bold dark:text-white">Starbucks</p>
                        <p className="text-xs text-zinc-500">Coffee • Bangalore</p>
                      </div>
                    </div>
                    <span className="text-zinc-900 font-bold dark:text-white">₹320</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 relative z-10">
                <p className="text-2xl font-bold mb-2">Detailed insights at your fingertips.</p>
                <p className="text-zinc-400">See category and merchant totals calculated from your confirmed records.</p>
              </div>
              {/* Decorative dots */}
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full" style={{
                  top: `${(i * 37 + 11) % 100}%`,
                  left: `${(i * 61 + 7) % 100}%`
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Web Dashboard Section */}
      <section className="py-24 bg-accent/5 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="bg-white dark:bg-zinc-800 rounded-panel p-8 lg:p-16 border border-border shadow-2xl relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6 font-rounded">Analyze on the big screen.</h2>
                <p className="text-text-muted text-lg mb-8 leading-relaxed">
                  Some things are better seen on a larger canvas. Use the Web Dashboard to understand patterns, review records, and plan with context.
                </p>
                <ul className="space-y-4 mb-10 text-lg font-medium">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white"><CheckCircle2 className="w-4 h-4" /></div>
                    View interactive reports & spending trends
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white"><CheckCircle2 className="w-4 h-4" /></div>
                    Search, filter, inspect, and export transaction views
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white"><CheckCircle2 className="w-4 h-4" /></div>
                    Use budgets, recurring-payment reviews, and planning tools
                  </li>
                </ul>
                <Link href="/tools" className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-transform">
                  Use Free Tools
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="relative">
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-900 rounded-2xl border-4 border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-8 bg-zinc-200 dark:bg-zinc-700 flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                  </div>
                  <div className="p-12 h-full flex flex-col justify-center gap-6">
                    <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-24 bg-accent/20 rounded-xl" />
                      <div className="h-24 bg-accent/10 rounded-xl" />
                      <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
                    </div>
                    <div className="h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl" />
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-2xl border border-border animate-float">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-secondary flex items-center justify-center rounded-xl text-accent">
                      <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">CSV Export</p>
                      <p className="text-xs text-text-muted">Ready for download</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-border rounded-panel overflow-hidden flex flex-col md:flex-row shadow-sm">
            <div className="md:w-1/2 p-12 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
                <ShieldCheck className="w-32 h-32 text-accent relative z-10" />
              </div>
            </div>
            <div className="md:w-1/2 p-12 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-6 font-rounded">Clear data boundaries. <br />Privacy by design.</h2>
              <ul className="space-y-4 text-text-muted">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Your data stays private</span>
                    <p className="text-sm">We never sell your financial data to third parties.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Encrypted in transit and at rest</span>
                    <p className="text-sm">Production connections and stored records are protected with encryption.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">No bank connection</span>
                    <p className="text-sm">Finnri does not connect to your bank. You add records by voice, text, or manual entry.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Availability Section */}
      <section id="availability" className="py-24 bg-accent-secondary/10">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 font-rounded">What is available today</h2>
            <p className="text-text-muted">Start with the features that ship now. No paid plan is currently offered on this website.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-panel border border-border bg-white dark:bg-zinc-800 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Finnri Free</h3>
                <p className="text-text-muted mb-6">Core tracking and a limited AI trial.</p>
                <div className="text-4xl font-bold mb-8 font-rounded">₹0 <span className="text-sm font-normal text-zinc-400">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-4 h-4 text-accent" /> Manual transaction and account tracking</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-4 h-4 text-accent" /> Search, filters, and basic dashboard totals</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-4 h-4 text-accent" /> CSV export of transaction views</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-4 h-4 text-accent" /> Limited trial credits for AI capture</li>
                </ul>
              </div>
              <Link href="/login" className="w-full py-4 rounded-2xl border-2 border-foreground text-center font-bold hover:bg-foreground hover:text-background transition-all">Get started</Link>
            </div>
            <div className="p-8 rounded-panel border border-border bg-white/60 dark:bg-zinc-800/60 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-4 right-4 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Coming Soon</div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Paid plans</h3>
                <p className="text-text-muted mb-6">Not available for purchase yet.</p>
                <p className="text-sm leading-6 text-text-muted">Prices and paid features will be published only after checkout, renewal, cancellation, and support flows are ready. Finnri does not currently sell a Pro subscription from this site.</p>
              </div>
              <div className="mt-8 w-full rounded-2xl bg-zinc-100 py-4 text-center text-sm font-bold text-zinc-500 dark:bg-zinc-900" aria-label="Paid plans coming soon">Coming soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 font-rounded">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Do I need to connect my bank?", a: "No. Finnri does not connect to banks or automatically import bank activity. You record transactions yourself by voice, text, or manual entry and maintain your own account labels and balances." },
              { q: "How does voice input work?", a: "In the mobile app, tap the microphone and speak naturally. Finnri sends the audio for transcription, creates an editable draft, and waits for your confirmation before saving a transaction." },
              { q: "What happens to voice and text drafts?", a: "Voice audio is held only long enough to transcribe it. Parse attempts, raw provider prompts, and raw provider responses are not persisted. A confirmed transaction may retain its source text as editable provenance." },
              { q: "Can I export my data?", a: "Yes. CSV export of the current transaction view is available today. PDF export is not available on the web, and CSV is not advertised as a paid-only feature." }
            ].map((faq) => (
              <details key={faq.q} className="group border border-border rounded-2xl bg-white p-6 dark:bg-zinc-800">
                <summary className="cursor-pointer text-lg font-bold">{faq.q}</summary>
                <p className="mt-3 text-text-muted leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section id="get-started" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-accent rounded-panel p-12 lg:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-accent/40">
            {/* Decorative circles */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-6xl font-bold mb-8 font-rounded leading-tight">Start with Finnri on the web.</h2>
              <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto">Create an account or continue as a guest to record transactions and explore the dashboard.</p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/login" className="flex items-center gap-3 bg-white text-accent px-10 py-5 rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                  <LayoutDashboard className="w-6 h-6" />
                  Open Web Dashboard
                </Link>
                <Link href="/tools" className="flex items-center gap-3 bg-zinc-900 text-white px-10 py-5 rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                  <TrendingUp className="w-6 h-6" />
                  Use Free Tools
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="relative flex h-10 w-24 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15">
                <Image src="/finnri-logo.png" alt="Finnri" fill sizes="96px" className="scale-[2.35] object-contain" />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-text-muted">
              <Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
              <Link href="/delete-account" className="hover:text-accent transition-colors">Delete Account</Link>
              <a href="mailto:support@finnri.app?subject=Finnri%20Support" className="hover:text-accent transition-colors">Contact Support</a>
            </div>

            <p className="text-xs text-text-muted">© 2026 Finnri. Built for day-to-day money tracking in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
