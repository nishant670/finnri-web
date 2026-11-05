import Link from "next/link";
import BrandMark from "@/app/components/ui/BrandMark";
import PlayBadge from "@/app/components/marketing/PlayBadge";
import { MERCHANT_IDENTITY_PUBLISHED, PLAY_STORE_LISTED } from "@/app/lib/site";

/** The public pages' footer: the mark and Play badge, then three link columns. */
export default function MarketingFooter() {
  const shell = "mx-auto max-w-6xl px-4 sm:px-6";
  return (
    <footer className="border-t border-border py-14">
      <div className={`${shell} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">Day-to-day money tracking for India, by voice, text or tap — saved only when you say so.</p>
          {PLAY_STORE_LISTED && <PlayBadge size="md" className="mt-5" />}
        </div>
        <FooterColumn title="Product" links={[["/#features", "Features"], ["/#pricing", "Pricing"], ["/tools/sip-calculator", "SIP calculator"], ["/tools/emi-calculator", "EMI calculator"], ["/login", "Web dashboard"]]} />
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
