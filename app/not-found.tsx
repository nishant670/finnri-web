import Link from "next/link";
import { ArrowLeft, Calculator, Smartphone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page not found | Finnri",
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
            <section className="w-full max-w-xl rounded-panel border border-border bg-white p-8 text-center shadow-xl dark:bg-zinc-900 sm:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">404</p>
                <h1 className="mt-3 text-4xl font-bold font-rounded">This Finnri page is not here.</h1>
                <p className="mx-auto mt-4 max-w-md leading-7 text-text-muted">The link may be incomplete or expired. You can return home, open the free tools, or sign in to the app.</p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-5 font-bold text-zinc-950"><ArrowLeft className="h-4 w-4" />Home</Link>
                    <Link href="/tools" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border px-5 font-bold"><Calculator className="h-4 w-4" />Free tools</Link>
                    <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border px-5 font-bold"><Smartphone className="h-4 w-4" />Open Finnri</Link>
                </div>
            </section>
        </main>
    );
}
