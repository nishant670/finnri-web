import Image from "next/image";
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
        <div className="min-h-screen bg-zinc-50 text-foreground dark:bg-zinc-950">
            <header className="border-b border-border bg-white dark:bg-zinc-900">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
                    <Link href="/" className="relative flex h-10 w-24 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15">
                        <Image src="/finnri-logo.png" alt="Finnri home" fill sizes="96px" className="scale-[2.35] object-contain" priority />
                    </Link>
                    <Link href="/" className="text-sm font-bold text-accent hover:underline">Back to Finnri</Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Legal</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight font-rounded sm:text-5xl">{title}</h1>
                <p className="mt-4 text-sm font-medium text-zinc-500">Effective {effectiveDate}</p>
                <div className="mt-8 rounded-3xl border border-border bg-white p-6 text-base leading-7 text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300 sm:p-8">{intro}</div>
                <div className="mt-12 space-y-10 [&_a]:font-semibold [&_a]:text-accent [&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:font-rounded [&_li]:ml-5 [&_li]:list-disc [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-zinc-600 dark:[&_p]:text-zinc-300 [&_ul]:space-y-2">
                    {children}
                </div>
            </main>

            <footer className="border-t border-border bg-white dark:bg-zinc-900">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <p>© 2026 Finnri</p>
                    <nav aria-label="Legal links" className="flex flex-wrap gap-5">
                        <Link href="/privacy" className="hover:text-accent">Privacy</Link>
                        <Link href="/terms" className="hover:text-accent">Terms</Link>
                        <Link href="/pricing" className="hover:text-accent">Pricing</Link>
                        <Link href="/refunds" className="hover:text-accent">Refunds</Link>
                        <Link href="/shipping" className="hover:text-accent">Digital delivery</Link>
                        {MERCHANT_IDENTITY_PUBLISHED && <Link href="/contact" className="hover:text-accent">Contact</Link>}
                        <Link href="/delete-account" className="hover:text-accent">Delete account</Link>
                        <a href="mailto:support@finnri.app?subject=Finnri%20Support" className="hover:text-accent">Support</a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}
