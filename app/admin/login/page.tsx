"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { AdminAPI, AdminAPIError } from "@/app/lib/admin-api";

function AdminLoginForm() {
    const router = useRouter();
    const search = useSearchParams();
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
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
            <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/15" />
            <form onSubmit={submit} className="relative w-full max-w-md rounded-panel border border-border bg-card p-7 shadow-2xl sm:p-9">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-zinc-950">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-accent">Restricted access</p>
                <h1 className="mt-2 text-3xl font-bold font-rounded">FINNRI Admin</h1>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                    Sign in with the email and PIN of an enabled admin account. Sessions expire after eight hours.
                </p>
                {error && (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                    >
                        {error}
                    </div>
                )}
                <label className="mt-7 block text-xs font-bold uppercase tracking-wider text-text-muted">
                    Email
                    <input
                        autoFocus
                        required
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent"
                        placeholder="admin@finnri.com"
                    />
                </label>
                <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-text-muted">
                    4-digit PIN
                    <div className="relative mt-2">
                        <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-text-muted" />
                        <input
                            required
                            inputMode="numeric"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                            className="min-h-12 w-full rounded-xl border border-border bg-background pl-12 pr-4 text-lg tracking-[0.4em] outline-none focus:border-accent"
                            placeholder="••••"
                        />
                    </div>
                </label>
                <button
                    disabled={busy}
                    className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950 disabled:opacity-60"
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
                <main className="grid min-h-screen place-items-center bg-background">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
                </main>
            }
        >
            <AdminLoginForm />
        </Suspense>
    );
}
