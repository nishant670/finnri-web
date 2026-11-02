"use client";

import React, { useState } from "react";
import { Check, Loader2, LogOut, Monitor, Moon, ShieldAlert, Sun } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiErrorMessage, UserAPI } from "@/app/lib/api";
import { ThemePreference, useTheme } from "@/app/components/ui/ThemeProvider";
import { useToast } from "@/app/components/ui/Toast";
import { buttonPrimary, buttonSecondary, Monogram, PageHeader, Panel, Segmented } from "@/app/components/dashboard/kit";

const THEMES = [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Match device" }] as const;
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

function Row({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0"><p className="font-semibold">{title}</p>{body ? <p className="mt-0.5 text-sm text-muted">{body}</p> : null}</div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

export default function SettingsScreen() {
    const { user, updateUser, logout, beginGuestClaim } = useAuth();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    // Seeded once; the dashboard renders this page only after the session is restored.
    const [name, setName] = useState(user?.username ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const trimmed = name.trim().replace(/\s+/g, " ");
    const dirty = trimmed !== (user?.username ?? "");
    const ThemeIcon = THEME_ICONS[theme];

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!trimmed) { setError("Enter a name before saving."); return; }
        setSaving(true);
        setError("");
        try {
            const response = await UserAPI.updateProfile({ username: trimmed });
            updateUser(response.data.user);
            toast({ title: "Name saved" });
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save your name. Try again."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-5 pb-20">
            <PageHeader title="Settings" description="Your name, how the dashboard looks, and signing out of this browser." />

            {user?.is_guest && (
                <section className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-surface p-4 sm:p-5">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <div>
                        <h2 className="font-bold">Save this guest workspace</h2>
                        <p className="mt-0.5 text-sm text-muted">Clearing this browser’s data, using a private window or moving to another device can lose its transactions, accounts and splits for good.</p>
                        <button type="button" onClick={beginGuestClaim} className={`${buttonPrimary} mt-3`}>Save this workspace</button>
                    </div>
                </section>
            )}

            <Panel className="divide-y divide-border overflow-hidden">
                <form onSubmit={(event) => void save(event)} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end">
                    <Monogram name={trimmed || "?"} className="h-12 w-12 text-lg" />
                    <label className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-muted">Name</span>
                        <input id="settings-name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} autoComplete="name" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10" />
                        {error && <span role="alert" className="mt-1 block text-sm font-semibold text-negative">{error}</span>}
                    </label>
                    <button type="submit" disabled={!dirty || saving} className={`${buttonPrimary} h-11`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
                </form>
                <Row title="Email" body={user?.is_guest ? "Guest workspace, not signed in" : "Your Google sign-in"}>
                    <span className="text-[15px] text-muted">{user?.email || user?.phone || "—"}</span>
                </Row>
                <Row title="Appearance" body="For this browser only.">
                    <span className="flex items-center gap-2"><ThemeIcon className="h-4 w-4 text-muted" aria-hidden="true" /><Segmented label="Theme" options={THEMES} value={theme} onChange={(value) => setTheme(value as ThemePreference)} /></span>
                </Row>
                <Row title="Sign out" body="Ends your session on this browser. Your data stays in your account.">
                    <button type="button" onClick={logout} className={buttonSecondary}><LogOut className="h-4 w-4" /> Sign out</button>
                </Row>
            </Panel>
        </div>
    );
}
