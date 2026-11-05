import BrandMark from "@/app/components/ui/BrandMark";
import Link from "next/link";
import type { ReactNode } from "react";
import { MERCHANT_IDENTITY_PUBLISHED } from "@/app/lib/site";

type LegalPageProps = {
    title: string;
    effectiveDate: string;
    intro: ReactNode;
    children: ReactNode;
};

export default function LegalPage({ title, effectiveDate, intro, children }: LegalPageProps) {
    return (
        <div className="font-body min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
                    <Link href="/" aria-label="Finnri home"><BrandMark compact tagline={false} /></Link>
                    <Link href="/" className="text-sm font-bold hover:underline">Back to Finnri</Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-eyebrow">Legal</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight font-display sm:text-5xl">{title}</h1>
                <p className="mt-4 text-sm font-medium text-muted">Effective {effectiveDate}</p>
                <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-base leading-7 text-muted shadow-sm sm:p-8">{intro}</div>
                <div className="mt-12 space-y-10 [&_a]:font-semibold [&_a]:text-eyebrow [&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:font-display [&_li]:ml-5 [&_li]:list-disc [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-muted [&_ul]:space-y-2">
                    {children}
                </div>
            </main>

            <footer className="border-t border-border bg-card">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>© 2026 Finnri</p>
                    <nav aria-label="Legal links" className="flex flex-wrap gap-5">
                        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                        <Link href="/terms" className="hover:text-foreground">Terms</Link>
                        <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
                        <Link href="/refunds" className="hover:text-foreground">Refunds</Link>
                        <Link href="/shipping" className="hover:text-foreground">Digital delivery</Link>
                        {MERCHANT_IDENTITY_PUBLISHED && <Link href="/contact" className="hover:text-foreground">Contact</Link>}
                        <Link href="/delete-account" className="hover:text-foreground">Delete account</Link>
                        <a href="mailto:support@finnri.app?subject=Finnri%20Support" className="hover:text-foreground">Support</a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}
