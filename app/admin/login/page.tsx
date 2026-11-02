"use client";

import BrandMark from "@/app/components/ui/BrandMark";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { AdminAPI, AdminAPIError } from "@/app/lib/admin-api";

function AdminLoginForm() {
    const router = useRouter();
    const search = useSearchParams();
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function submit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            await AdminAPI.login(email, pin);
            router.replace(search.get("next") || "/admin");
            router.refresh();
        } catch (reason) {
            setError(reason instanceof AdminAPIError ? reason.message : "Unable to sign in");
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-5">
            <div aria-hidden="true" className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full blur-[120px]" style={{ background: "var(--glow)" }} />
            <form onSubmit={submit} className="relative w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-2xl sm:p-9">
                <div className="flex items-center gap-2">
                    <BrandMark compact tagline={false} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-selected px-2 py-0.5 text-[11px] font-bold text-eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Admin</span>
                </div>
                                <h1 className="font-display mt-6 text-[28px] font-bold leading-tight">Admin sign in</h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                    Sign in with the email and PIN of an enabled admin account. Sessions expire after eight hours.
                </p>
                {error && (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl border border-negative/30 bg-negative/10 p-3 text-sm text-negative"
                    >
                        {error}
                    </div>
                )}
                <label className="mt-6 block text-sm font-semibold text-muted">
                    Email
                    <input
                        autoFocus
                        required
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
                        placeholder="admin@finnri.com"
                    />
                </label>
                <label className="mt-4 block text-sm font-semibold text-muted">
                    4-digit PIN
                    <div className="relative mt-2">
                        <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-muted" />
                        <input
                            required
                            type={showPin ? "text" : "password"}
                            autoComplete="current-password"
                            inputMode="numeric"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                            className="min-h-12 w-full rounded-xl border border-border bg-background pl-12 pr-12 text-lg tracking-[0.4em] outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
                            placeholder="••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin((shown) => !shown)}
                            aria-label={showPin ? "Hide PIN" : "Show PIN"}
                            aria-pressed={showPin}
                            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </label>
                <button
                    disabled={busy}
                    className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-60"
                >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in securely
                </button>
            </form>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense
            fallback={
                <main className="grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted">
                    <div role="status">Loading…</div>
                </main>
            }
        >
            <AdminLoginForm />
        </Suspense>
    );
}
