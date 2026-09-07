"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);
    return (
        <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
            <section className="max-w-lg rounded-panel border border-border bg-white p-8 text-center shadow-xl dark:bg-zinc-900">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600">Something went wrong</p>
                <h1 className="mt-3 text-3xl font-bold font-rounded">Finnri could not open this page.</h1>
                <p className="mt-4 leading-7 text-text-muted">Your data is safe. Try the request again; if it keeps failing, contact support.</p>
                <button onClick={reset} className="mt-7 min-h-12 rounded-2xl bg-accent px-6 font-bold text-zinc-950">Try again</button>
            </section>
        </main>
    );
}
