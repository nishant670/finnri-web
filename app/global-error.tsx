"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/app/lib/crash-reporting";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { reportBrowserError(error); }, [error]);
    return (
        <html lang="en">
            <body>
                <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
                    <section style={{ maxWidth: 520, textAlign: "center" }}>
                        <h1>Finnri hit an unexpected error.</h1>
                        <p>Your data is safe. Please try again.</p>
                        <button onClick={reset} style={{ minHeight: 48, padding: "0 24px", border: 0, borderRadius: 16, background: "#E76F51", color: "white", fontWeight: 700 }}>Try again</button>
                    </section>
                </main>
            </body>
        </html>
    );
}
