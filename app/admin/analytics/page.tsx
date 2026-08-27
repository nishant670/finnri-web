"use client";

import { useEffect, useState } from "react";
import FunnelChart from "@/app/components/admin/FunnelChart";
import CohortGrid from "@/app/components/admin/CohortGrid";
import TrendChart from "@/app/components/admin/TrendChart";
import StatTile from "@/app/components/admin/StatTile";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, dateWindow, withQuery } from "@/app/lib/admin-api";
import { percent } from "@/app/lib/admin-metrics";

type Activation = { cohort_size: number; onboarded: number; steps: { code: string; label: string; users: number; percent?: number }[] };
type Retention = { weeks: number; cohorts: { cohort_week: string; size: number; retention: number[] }[] };
type Engagement = { series: Record<string, unknown>[] };
type Adoption = {
    registered_users: number;
    features: { code: string; users: number; percent: number }[];
    guest_conversion: { converted: number; guest_rows_remaining: number; percent: number };
};
export default function AnalyticsPage() {
    const [activation, setActivation] = useState<Activation | null>(null);
    const [retention, setRetention] = useState<Retention | null>(null);
    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [adoption, setAdoption] = useState<Adoption | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const window = dateWindow(90);
        Promise.all([
            AdminAPI.get<Activation>(withQuery("analytics/activation", { cohort_start: window.start, cohort_end: window.end })),
            AdminAPI.get<Retention>("analytics/retention?weeks=12"),
            AdminAPI.get<Engagement>(withQuery("analytics/engagement", window)),
            AdminAPI.get<Adoption>("analytics/feature-adoption"),
        ])
            .then(([a, r, e, f]) => {
                setActivation(a);
                setRetention(r);
                setEngagement(e);
                setAdoption(f);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load analytics"))
            .finally(() => setLoading(false));
    }, []);
    if (loading) return <PageSkeleton />;
    return (
        <div className="space-y-7">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Product intelligence</p>
                <h1 className="mt-2 text-3xl font-bold font-rounded">Analytics</h1>
                <p className="mt-2 text-sm text-text-muted">
                    Activation and retention are approximated from signups, sessions, entries, and AI usage—no screen-event pipeline.
                </p>
            </header>
            {error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
            {activation && adoption && (
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile label="Signup cohort" value={activation.cohort_size} />
                    <StatTile label="Onboarded" value={activation.onboarded} hint="Reached first transaction" />
                    <StatTile label="Registered users" value={adoption.registered_users} />
                    <StatTile
                        label="Guest conversion"
                        value={percent(adoption.guest_conversion.percent)}
                        hint={`${adoption.guest_conversion.converted} converted rows`}
                    />
                </section>
            )}
            <section className="grid gap-5 xl:grid-cols-2">
                {activation && (
                    <article className="rounded-panel border border-border bg-card p-6">
                        <h2 className="text-lg font-bold font-rounded">7-day activation funnel</h2>
                        <div className="mt-6">
                            <FunnelChart steps={activation.steps} />
                        </div>
                    </article>
                )}
                {engagement && (
                    <article className="rounded-panel border border-border bg-card p-6">
                        <h2 className="text-lg font-bold font-rounded">DAU / WAU / MAU</h2>
                        <p className="mt-1 text-xs text-text-muted">Daily active-user series; chart shows DAU.</p>
                        <div className="mt-5">
                            <TrendChart data={engagement.series} dataKey="dau" label="Daily active users" />
                        </div>
                    </article>
                )}
            </section>
            {retention && (
                <section className="rounded-panel border border-border bg-card p-6">
                    <h2 className="text-lg font-bold font-rounded">Retention cohorts</h2>
                    <p className="mt-1 text-xs text-text-muted">Signup week × weeks since signup; cells are percent active.</p>
                    <div className="mt-5">
                        <CohortGrid cohorts={retention.cohorts} />
                    </div>
                </section>
            )}
            {adoption && (
                <section className="rounded-panel border border-border bg-card p-6">
                    <h2 className="text-lg font-bold font-rounded">Feature adoption</h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {adoption.features.map((feature) => (
                            <div key={feature.code} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                                <p className="text-xs font-bold capitalize text-text-muted">{feature.code.replaceAll("_", " ")}</p>
                                <p className="mt-3 text-2xl font-bold font-rounded">{percent(feature.percent)}</p>
                                <p className="mt-1 text-xs text-text-muted">{feature.users} users</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
