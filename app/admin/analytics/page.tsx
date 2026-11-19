"use client";

import { useEffect, useState } from "react";
import FunnelChart from "@/app/components/admin/FunnelChart";
import CohortGrid from "@/app/components/admin/CohortGrid";
import TrendChart from "@/app/components/admin/TrendChart";
import StatTile from "@/app/components/admin/StatTile";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, dateWindow, withQuery } from "@/app/lib/admin-api";
import { percent } from "@/app/lib/admin-metrics";
import IncludeTestToggle from "@/app/components/admin/IncludeTestToggle";
import { useIncludeTest } from "@/app/lib/admin-test-users";

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
    const { includeTest, setIncludeTest, includeTestParam } = useIncludeTest();
    useEffect(() => {
        const window = dateWindow(90);
        const include_test = includeTestParam;
        Promise.all([
            AdminAPI.get<Activation>(withQuery("analytics/activation", { cohort_start: window.start, cohort_end: window.end, include_test })),
            AdminAPI.get<Retention>(withQuery("analytics/retention", { weeks: 12, include_test })),
            AdminAPI.get<Engagement>(withQuery("analytics/engagement", { ...window, include_test })),
            AdminAPI.get<Adoption>(withQuery("analytics/feature-adoption", { include_test })),
        ])
            .then(([a, r, e, f]) => {
                setActivation(a);
                setRetention(r);
                setEngagement(e);
                setAdoption(f);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load analytics"))
            .finally(() => setLoading(false));
    }, [includeTestParam]);
    if (loading) return <PageSkeleton />;
    return (
        <div className="space-y-7">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="font-display text-[30px] font-bold leading-tight max-lg:sr-only sm:text-[34px]">Analytics</h1>
                    <p className="mt-2 text-sm text-muted">
                        Activation and retention are approximated from signups, sessions, entries, and AI usage—no screen-event pipeline.
                    </p>
                </div>
                <IncludeTestToggle value={includeTest} onChange={setIncludeTest} />
            </header>
            {error && <div className="rounded-xl bg-negative/10 p-4 text-negative">{error}</div>}
            {activation && adoption && (
                <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
                    <article className="min-w-0 rounded-2xl border border-border bg-card p-6">
                        <h2 className="text-[17px] font-bold">7-day activation funnel</h2>
                        <div className="mt-6">
                            <FunnelChart steps={activation.steps} />
                        </div>
                    </article>
                )}
                {engagement && (
                    <article className="min-w-0 rounded-2xl border border-border bg-card p-6">
                        <h2 className="text-[17px] font-bold">DAU / WAU / MAU</h2>
                        <p className="mt-1 text-xs text-muted">Daily active-user series; chart shows DAU.</p>
                        <div className="mt-5">
                            <TrendChart data={engagement.series} dataKey="dau" label="Daily active users" />
                        </div>
                    </article>
                )}
            </section>
            {retention && (
                <section className="min-w-0 rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-[17px] font-bold">Retention cohorts</h2>
                    <p className="mt-1 text-xs text-muted">Signup week × weeks since signup; cells are percent active.</p>
                    <div className="mt-5">
                        <CohortGrid cohorts={retention.cohorts} />
                    </div>
                </section>
            )}
            {adoption && (
                <section className="min-w-0 rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-[17px] font-bold">Feature adoption</h2>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                        {adoption.features.map((feature) => (
                            <div key={feature.code} className="rounded-2xl bg-track p-4">
                                <p className="text-xs font-bold capitalize text-muted">{feature.code.replaceAll("_", " ")}</p>
                                <p className="mt-3 text-2xl font-bold">{percent(feature.percent)}</p>
                                <p className="mt-1 text-xs text-muted">{feature.users} users</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
