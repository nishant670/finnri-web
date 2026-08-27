"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import StatTile from "@/app/components/admin/StatTile";
import DateRangePicker from "@/app/components/admin/DateRangePicker";
import TrendChart from "@/app/components/admin/TrendChart";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, inclusiveDateRange, withQuery } from "@/app/lib/admin-api";
import { compactNumber, percent } from "@/app/lib/admin-metrics";
import { formatMinorMoney, formatUSDMicros, toLocalISO } from "@/app/lib/format";

type Overview = {
    users: { total: number; registered: number; guests: number; new: number; new_delta_percent: number };
    activation_rate: number;
    engagement: { dau: number; wau: number; mau: number; stickiness: number };
    subscriptions: { active: number; modelled_mrr_minor: number; basis: string };
    ai: {
        events: number;
        credits_used: number;
        estimated_cost_usd_micros: number;
        alerts: { code: string; message: string; severity: string }[];
    };
    open_feedback: number;
};
type Series = { series: Record<string, unknown>[] };
export default function AdminOverview() {
    const today = toLocalISO();
    const monthAgo = toLocalISO(new Date(Date.now() - 29 * 86400000));
    const [range, setRange] = useState({ start: monthAgo, end: today });
    const [data, setData] = useState<Overview | null>(null);
    const [signups, setSignups] = useState<Record<string, unknown>[]>([]);
    const [aiSeries, setAISeries] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const window = inclusiveDateRange(range.start, range.end);
        try {
            const [overview, signup, ai] = await Promise.all([
                AdminAPI.get<Overview>(withQuery("overview", window)),
                AdminAPI.get<Series>(withQuery("analytics/signups", { ...window, bucket: "day" })),
                AdminAPI.get<Series>(withQuery("ai/metrics/timeseries", { ...window, bucket: "day" })),
            ]);
            setData(overview);
            setSignups(signup.series);
            setAISeries(ai.series);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load overview");
        } finally {
            setLoading(false);
        }
    }, [range]);
    useEffect(() => {
        void load();
    }, [load]);
    if (loading && !data) return <PageSkeleton />;
    return (
        <div className="space-y-7">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Command centre</p>
                    <h1 className="mt-2 text-3xl font-bold font-rounded sm:text-4xl">Overview</h1>
                    <p className="mt-2 text-sm text-text-muted">
                        Users, activation, subscriptions, AI cost, and operational signals in one window.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <DateRangePicker {...range} onChange={setRange} />
                    <button
                        onClick={() => void load()}
                        className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>
            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    {error}
                </div>
            )}
            {data && (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatTile
                            label="Total users"
                            value={compactNumber(data.users.total)}
                            hint={`${data.users.registered.toLocaleString("en-IN")} registered · ${data.users.guests.toLocaleString("en-IN")} guests`}
                        />
                        <StatTile label="New this period" value={compactNumber(data.users.new)} delta={data.users.new_delta_percent} />
                        <StatTile
                            label="Activation rate"
                            value={percent(data.activation_rate)}
                            hint="Registered users with a first transaction"
                        />
                        <StatTile
                            label="Daily active users"
                            value={compactNumber(data.engagement.dau)}
                            hint={`${data.engagement.wau} WAU · ${data.engagement.mau} MAU`}
                        />
                        <StatTile label="Active subscribers" value={data.subscriptions.active} hint="Current active entitlements" />
                        <StatTile
                            label="Modelled MRR"
                            value={formatMinorMoney(data.subscriptions.modelled_mrr_minor)}
                            hint="Forecast from plan prices; not cash collected"
                        />
                        <StatTile
                            label="AI credits used"
                            value={compactNumber(data.ai.credits_used)}
                            hint={`${data.ai.events.toLocaleString("en-IN")} usage events`}
                        />
                        <StatTile
                            label="AI cost"
                            value={formatUSDMicros(data.ai.estimated_cost_usd_micros)}
                            hint="Estimated provider cost"
                        />
                    </section>
                    {data.ai.alerts?.length > 0 && (
                        <section className="rounded-panel border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                            <div className="flex gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <h2 className="font-bold">AI cost alerts</h2>
                                    {data.ai.alerts.map((alert) => (
                                        <p key={alert.code} className="mt-1 text-sm">
                                            {alert.message}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                    <section className="grid gap-5 xl:grid-cols-2">
                        <article className="rounded-panel border border-border bg-card p-5 sm:p-7">
                            <h2 className="text-lg font-bold font-rounded">Signups</h2>
                            <p className="mt-1 text-xs text-text-muted">New user rows per day</p>
                            <div className="mt-4">
                                <TrendChart data={signups} dataKey="total" xKey="period" label="Daily signups" />
                            </div>
                        </article>
                        <article className="rounded-panel border border-border bg-card p-5 sm:p-7">
                            <h2 className="text-lg font-bold font-rounded">AI cost</h2>
                            <p className="mt-1 text-xs text-text-muted">Estimated or actual provider cost in USD micros</p>
                            <div className="mt-4">
                                <TrendChart data={aiSeries} dataKey="cost_usd_micros" label="Daily AI cost" formatter={formatUSDMicros} />
                            </div>
                        </article>
                    </section>
                    <section className="grid gap-4 md:grid-cols-2">
                        <Link href="/admin/feedback" className="group rounded-panel border border-border bg-card p-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Open feedback</p>
                            <p className="mt-3 text-3xl font-bold font-rounded">{data.open_feedback}</p>
                            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">
                                Open inbox <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </Link>
                        <Link href="/admin/ai" className="group rounded-panel border border-border bg-card p-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">AI stickiness context</p>
                            <p className="mt-3 text-3xl font-bold font-rounded">{percent(data.engagement.stickiness)}</p>
                            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">
                                Inspect usage <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </section>
                </>
            )}
        </div>
    );
}
