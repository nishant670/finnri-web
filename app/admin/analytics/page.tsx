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
type ProductFunnel = {
    people: number;
    steps: { name: string; users: number; events: number; labels: { label: string; users: number; events: number }[] }[];
};
export default function AnalyticsPage() {
    const [activation, setActivation] = useState<Activation | null>(null);
    const [retention, setRetention] = useState<Retention | null>(null);
    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [adoption, setAdoption] = useState<Adoption | null>(null);
    const [funnel, setFunnel] = useState<ProductFunnel | null>(null);
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
        // Separate from the batch above: an API that predates this endpoint
        // answers 404, and that must not blank the rest of the page.
        AdminAPI.get<ProductFunnel>("analytics/product-funnel").then(setFunnel).catch(() => setFunnel(null));
    }, []);
    if (loading) return <PageSkeleton />;
    return (
        <div className="space-y-7">
            <header>
                <h1 className="font-display text-[30px] font-bold leading-tight max-lg:sr-only sm:text-[34px]">Analytics</h1>
                <p className="mt-2 text-sm text-muted">
                    Activation and retention are approximated from signups, sessions, entries, and AI usage—no screen-event pipeline.
                </p>
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
            {funnel && (
                <section className="min-w-0 rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-[17px] font-bold">In-app steps, last 30 days</h2>
                    <p className="mt-1 text-xs text-muted">
                        Recorded by the app itself: {funnel.people} people. Each step shows how many people reached it and how often.
                    </p>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="text-xs text-muted">
                                <tr><th className="pb-2 font-semibold">Step</th><th className="pb-2 font-semibold">People</th><th className="pb-2 font-semibold">Times</th><th className="pb-2 font-semibold">By kind</th></tr>
                            </thead>
                            <tbody>
                                {funnel.steps.map((step) => (
                                    <tr key={step.name} className="border-t border-border align-top">
                                        <td className="py-2.5 font-semibold capitalize">{step.name.replaceAll("_", " ")}</td>
                                        <td className="py-2.5 tabular-nums">{step.users}</td>
                                        <td className="py-2.5 tabular-nums">{step.events}</td>
                                        <td className="py-2.5 text-muted">
                                            {step.labels.length ? step.labels.map((label) => `${label.label.replaceAll("_", " ")} ${label.users}`).join(" · ") : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
