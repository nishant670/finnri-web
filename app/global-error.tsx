"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/app/lib/crash-reporting";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { reportBrowserError(error); }, [error]);
    return (
        <html lang="en">
            <body>
                <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif", background: "#FDF5F7", color: "#2D2D2D" }}>
                    <section style={{ maxWidth: 520, textAlign: "center" }}>
                        <h1 style={{ fontSize: 28, margin: 0 }}>Finnri hit an unexpected error.</h1>
                        <p style={{ color: "rgba(45,45,45,0.75)", lineHeight: 1.6 }}>Your data is safe. Try again, and if it keeps happening, write to support@finnri.app.</p>
                        <button onClick={reset} style={{ minHeight: 48, padding: "0 24px", border: 0, borderRadius: 999, background: "#FF8865", color: "#2D2D2D", fontWeight: 700, cursor: "pointer" }}>Try again</button>
                    </section>
                </main>
            </body>
        </html>
    );
}
