"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/app/lib/crash-reporting";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { reportBrowserError(error); }, [error]);
    return (
        <main className="font-body grid min-h-screen place-items-center bg-background px-6 text-foreground">
            <section className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-negative">Something went wrong</p>
                <h1 className="mt-3 text-3xl font-bold font-display">Finnri could not open this page.</h1>
                <p className="mt-4 leading-7 text-muted">Your data is safe. Try the request again; if it keeps failing, contact support.</p>
                <button onClick={reset} className="mt-7 min-h-12 rounded-full bg-accent px-6 font-bold text-on-accent">Try again</button>
            </section>
        </main>
    );
}
