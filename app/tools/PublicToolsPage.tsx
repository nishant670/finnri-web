import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, ChartLine, Menu, ShieldCheck } from "lucide-react";
import { PROJECTION_DISCLAIMER } from "@/app/lib/calculators";
import { MERCHANT_IDENTITY_PUBLISHED } from "@/app/lib/site";
import PublicToolsClient from "./PublicToolsClient";

const faqs = [
  { q: "Is the EMI calculator free?", a: "Yes. The EMI calculator on this page is free and does not require login." },
  { q: "Is the SIP calculator free?", a: "Yes. You can estimate SIP maturity value, invested amount, returns, and yearly growth without an account." },
  { q: "Are the calculations financial advice?", a: PROJECTION_DISCLAIMER },
];

export default function PublicToolsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex min-h-20 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Finnri home">
            <span className="relative flex h-11 w-28 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15">
              <Image src="/finnri-logo.png" alt="Finnri" fill sizes="112px" className="scale-[2.35] object-contain" priority />
            </span>
          </Link>
          <div className="hidden items-center gap-8 lg:flex">
            <a href="#calculators" className="text-sm font-medium transition-colors hover:text-accent">Calculators</a>
            <a href="#how-to-use" className="text-sm font-medium transition-colors hover:text-accent">How to use</a>
            <a href="#faq" className="text-sm font-medium transition-colors hover:text-accent">FAQ</a>
            <Link href="/login" className="text-sm font-semibold text-accent transition-opacity hover:opacity-80">Web Dashboard</Link>
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background">
              Get Finnri <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <details className="relative lg:hidden">
            <summary className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-xl" aria-label="Toggle navigation">
              <Menu className="h-6 w-6" />
            </summary>
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-border bg-white p-5 shadow-xl dark:bg-zinc-900">
              <div className="flex flex-col gap-4 text-base font-semibold">
                <a href="#calculators">Calculators</a>
                <a href="#how-to-use">How to use</a>
                <a href="#faq">FAQ</a>
                <Link href="/login" className="text-accent">Web Dashboard</Link>
              </div>
            </div>
          </details>
        </div>
      </nav>

      <PublicToolsClient />

      <section id="how-to-use" className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 xl:grid-cols-[0.7fr_1.3fr] xl:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Simple planning</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight font-rounded">Use the calculators before opening an account</h2>
              <p className="mt-4 text-text-muted leading-7">These tools are free public utilities. Finnri accounts are only needed when you want to track expenses, budgets, subscriptions, and dashboard reports.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ChartLine, title: "SIP calculator", body: "Enter monthly investment, expected return, tenure, step-up, and current corpus." },
                { icon: Calculator, title: "EMI calculator", body: "Enter loan amount, annual interest rate, and tenure to estimate repayment." },
                { icon: ShieldCheck, title: "No login needed", body: "Calculations run in your browser and do not require a Finnri account." },
              ].map((item) => (
                <article key={item.title} className="rounded-2xl border border-border bg-white p-6 dark:bg-zinc-900">
                  <item.icon className="h-6 w-6 text-accent" />
                  <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="container mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold tracking-tight font-rounded">Calculator FAQ</h2>
          <div className="mt-8 grid gap-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="rounded-2xl border border-border bg-white p-6 dark:bg-zinc-900">
                <summary className="cursor-pointer text-lg font-bold">{faq.q}</summary>
                <p className="mt-3 leading-7 text-text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="container mx-auto flex flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" aria-label="Finnri home" className="relative flex h-10 w-24 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15">
            <Image src="/finnri-logo.png" alt="" fill sizes="96px" className="scale-[2.35] object-contain" />
          </Link>
          <div className="flex flex-wrap gap-5 text-sm font-medium text-text-muted">
            <Link href="/">Home</Link>
            <Link href="/login">Web Dashboard</Link>
            <a href="#calculators">Calculators</a>
            <Link href="/pricing">Pricing</Link>
            <Link href="/refunds">Refunds</Link>
            {MERCHANT_IDENTITY_PUBLISHED && <Link href="/contact">Contact</Link>}
          </div>
          <p className="text-xs text-text-muted">© 2026 Finnri.</p>
        </div>
      </footer>
    </main>
  );
}
