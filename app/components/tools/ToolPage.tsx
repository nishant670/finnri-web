import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight } from "lucide-react";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingNav from "@/app/components/marketing/MarketingNav";
import PlayBadge from "@/app/components/marketing/PlayBadge";
import ScrollReveal from "@/app/components/marketing/ScrollReveal";
import { PLAY_STORE_LISTED, SITE_URL } from "@/app/lib/site";

export const toolShell = "mx-auto max-w-6xl px-4 sm:px-6";

export interface Faq { q: string; a: string }
export interface Crumb { name: string; href: string }

/** Structured data every tool page carries: breadcrumbs, the FAQ, and the tool itself. */
export function ToolSchemas({ crumbs, faqs, app }: { crumbs: Crumb[]; faqs: Faq[]; app?: { name: string; description: string; path: string } }) {
  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: `${SITE_URL}${crumb.href === "/" ? "" : crumb.href}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
    },
  ];
  if (app) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: app.name,
      description: app.description,
      url: `${SITE_URL}${app.path}`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: "Finnri", url: SITE_URL },
    });
  }
  return <>{schemas.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}</>;
}

/** Nav, reveal-on-scroll and footer around a tool page's content. */
export function ToolPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-background font-body text-foreground">
      <a href="#main-content" className="sr-only z-[100] rounded-xl bg-card px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <MarketingNav />
      <ScrollReveal />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}

/** The top of a tool page: breadcrumbs, the H1 and a lead line, over a soft glow. */
export function ToolHero({ crumbs, title, lead, points, children }: { crumbs: Crumb[]; title: ReactNode; lead: ReactNode; points: string[]; children: ReactNode }) {
  return (
    <section className="relative isolate pb-16 pt-24 sm:pt-28 lg:pb-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-dot-field absolute inset-0" />
        <div className="absolute -top-48 right-[-10%] h-[560px] w-[560px] rounded-full blur-[120px]" style={{ background: "var(--glow)" }} />
      </div>
      <div className={toolShell}>
        <nav aria-label="Breadcrumb" className="rise-in">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            {crumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                {index === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-foreground">{crumb.name}</span> : <Link href={crumb.href} className="hover:text-foreground">{crumb.name}</Link>}
              </li>
            ))}
          </ol>
        </nav>
        <div className="mb-8 mt-5 grid gap-5 lg:mb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="font-display rise-in text-balance text-[42px] font-bold leading-[1.02] sm:text-6xl" style={{ "--delay": "60ms" } as CSSProperties}>{title}</h1>
            <p className="rise-in mt-4 max-w-2xl text-lg leading-relaxed text-muted" style={{ "--delay": "140ms" } as CSSProperties}>{lead}</p>
          </div>
          <ul className="rise-in flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted lg:flex-col lg:items-start" style={{ "--delay": "220ms" } as CSSProperties}>
            {points.map((point) => <li key={point} className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" strokeWidth={3} />{point}</li>)}
          </ul>
        </div>
        <div className="rise-in" style={{ "--delay": "260ms" } as CSSProperties}>{children}</div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: ReactNode; body?: ReactNode }) {
  return (
    <div data-reveal className="mb-10 max-w-3xl">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">{eyebrow}</p>
      <h2 className="font-display text-balance text-3xl font-bold leading-[1.08] sm:text-4xl lg:text-[44px]">{title}</h2>
      {body ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

export function FaqSection({ faqs, title = "Questions people ask" }: { faqs: Faq[]; title?: string }) {
  return (
    <section id="faq" className="scroll-mt-20 py-16 lg:py-24">
      <div className={`${toolShell} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
        <SectionHeading eyebrow="FAQ" title={title} />
        <div data-reveal style={{ "--reveal-delay": "100ms" } as CSSProperties} className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-border bg-card px-5 transition-colors open:shadow-sm">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
                <h3>{faq.q}</h3>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-track transition-transform duration-300 group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span>
              </summary>
              <p className="disclosure-enter pb-5 leading-relaxed text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The bridge from a free tool to the app: one coral band, Play badge first. */
export function AppCta({ title, body }: { title: string; body: string }) {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:pb-28">
      <div data-reveal="scale" className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-accent px-6 py-14 text-[#2D2D2D] sm:px-12 lg:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_45%),radial-gradient(circle_at_90%_90%,rgba(224,70,95,0.4),transparent_50%)]" />
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#2D2D2D]/70">From Finnri</p>
            <h2 className="font-display mt-3 text-balance text-3xl font-bold leading-[1.05] sm:text-5xl">{title}</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#2D2D2D]/80">{body}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            {PLAY_STORE_LISTED && <PlayBadge className="self-start lg:self-end" />}
            <Link href="/login" className="group inline-flex h-[60px] items-center justify-center gap-2 self-start rounded-2xl bg-white px-6 text-[15px] font-bold text-zinc-950 shadow-xl transition duration-300 hover:-translate-y-0.5 lg:self-end">
              Open the web dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A card linking to the other calculator, with a live sample result. */
export function RelatedTool({ href, title, body, sample, sampleLabel, icon }: { href: string; title: string; body: string; sample: string; sampleLabel: string; icon: ReactNode }) {
  return (
    <Link href={href} data-reveal className="group grid gap-6 rounded-3xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-selected text-accent">{icon}</span>
      <span>
        <span className="font-display block text-2xl font-bold">{title}</span>
        <span className="mt-1 block text-muted">{body}</span>
      </span>
      <span className="flex items-center gap-4">
        <span className="text-right">
          <span className="font-display block text-2xl font-bold tabular-nums">{sample}</span>
          <span className="block text-xs text-muted">{sampleLabel}</span>
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full border border-border transition group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"><ArrowRight className="h-5 w-5" /></span>
      </span>
    </Link>
  );
}
