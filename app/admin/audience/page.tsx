"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import StatTile from "@/app/components/admin/StatTile";
import DateRangePicker from "@/app/components/admin/DateRangePicker";
import IncludeTestToggle from "@/app/components/admin/IncludeTestToggle";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, inclusiveDateRange, withQuery } from "@/app/lib/admin-api";
import { useIncludeTest } from "@/app/lib/admin-test-users";
import { formatDate, toLocalISO } from "@/app/lib/format";

type Bucket = { key: string; users: number };
type Audience = {
    active_users: number;
    recorded_users: number;
    unrecorded_active_users: number;
    platform: Bucket[];
    form_factor: Bucket[];
    variant: Bucket[];
    app_version: Bucket[];
    os: Bucket[];
    device: Bucket[];
    signups_by_platform: Bucket[];
    push_reach: Bucket[];
    recorded_since?: string;
};

const labels: Record<string, string> = {
    android: "Android app",
    ios: "iPhone app",
    web: "Website",
    phone: "Phone",
    tablet: "Tablet",
    desktop: "Computer",
    play: "Play Store app",
    preview: "Preview (staging)",
    debug: "Debug build",
    unknown: "Not known",
};
const label = (key: string) => labels[key] ?? key;

export default function AdminAudiencePage() {
    const today = toLocalISO();
    const monthAgo = toLocalISO(new Date(Date.now() - 29 * 86400000));
    const [range, setRange] = useState({ start: monthAgo, end: today });
    const [data, setData] = useState<Audience | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { includeTest, setIncludeTest, includeTestParam } = useIncludeTest();
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setData(
                await AdminAPI.get<Audience>(
                    withQuery("audience", { ...inclusiveDateRange(range.start, range.end), include_test: includeTestParam }),
                ),
            );
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load audience");
        } finally {
            setLoading(false);
        }
    }, [range, includeTestParam]);
    useEffect(() => {
        void load();
    }, [load]);
    if (loading && !data) return <PageSkeleton />;
    const count = (rows: Bucket[] | undefined, key: string) => rows?.find((row) => row.key === key)?.users ?? 0;
    return (
        <div className="space-y-7">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="font-display text-[30px] font-bold leading-tight max-lg:sr-only sm:text-[34px]">Audience</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        Which apps, phones and browsers people used in this window. Someone on both the app and the website counts in both.
                        {data?.recorded_since ? ` Recorded since ${formatDate(data.recorded_since)}.` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <DateRangePicker {...range} onChange={setRange} />
                    <IncludeTestToggle value={includeTest} onChange={setIncludeTest} />
                    <button
                        onClick={() => void load()}
                        className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>
            {error && <div className="rounded-2xl border border-negative/30 bg-negative/10 p-4 text-sm text-negative">{error}</div>}
            {data && (
                <>
                    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <StatTile
                            label="Active people"
                            value={data.active_users.toLocaleString("en-IN")}
                            hint={
                                data.unrecorded_active_users
                                    ? `${data.unrecorded_active_users.toLocaleString("en-IN")} not seen on a recorded app or browser yet`
                                    : "All seen on a recorded app or browser"
                            }
                        />
                        <StatTile label="On the Android app" value={count(data.platform, "android").toLocaleString("en-IN")} />
                        <StatTile label="On the website" value={count(data.platform, "web").toLocaleString("en-IN")} />
                        <StatTile
                            label="Phone vs computer"
                            value={`${(count(data.form_factor, "phone") + count(data.form_factor, "tablet")).toLocaleString("en-IN")} · ${count(data.form_factor, "desktop").toLocaleString("en-IN")}`}
                            hint="Phone or tablet · computer"
                        />
                    </section>
                    <section className="grid gap-5 xl:grid-cols-2">
                        <Breakdown title="Where they use Finnri" rows={data.platform} total={data.recorded_users} />
                        <Breakdown title="Phone, tablet or computer" rows={data.form_factor} total={data.recorded_users} />
                        <Breakdown
                            title="App version"
                            hint="Android and iPhone app only. Older builds without version info show as “Not known”."
                            rows={data.app_version}
                            total={data.recorded_users}
                        />
                        <Breakdown
                            title="Which app"
                            hint="Store app, or one of your test builds."
                            rows={data.variant}
                            total={data.recorded_users}
                        />
                        <Breakdown title="Top devices and browsers" rows={data.device} total={data.recorded_users} />
                        <Breakdown title="Operating system" rows={data.os} total={data.recorded_users} />
                        <Breakdown
                            title="New accounts by where they signed up"
                            hint="Accounts made in this window."
                            rows={data.signups_by_platform}
                            total={data.signups_by_platform.reduce((sum, row) => sum + row.users, 0)}
                        />
                        <Breakdown
                            title="Push reach"
                            hint="People with notifications on right now, whatever the window."
                            rows={data.push_reach}
                            total={0}
                        />
                    </section>
                </>
            )}
        </div>
    );
}

function Breakdown({ title, hint, rows, total }: { title: string; hint?: string; rows: Bucket[]; total: number }) {
    return (
        <article className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-7">
            <h2 className="text-[17px] font-bold">{title}</h2>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
            {rows.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Nothing recorded in this window.</p>
            ) : (
                <table className="mt-4 w-full text-sm">
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key} className="border-t border-border first:border-t-0">
                                <td className="py-2.5 pr-3 font-semibold">{label(row.key)}</td>
                                <td className="py-2.5 text-right tabular-nums">{row.users.toLocaleString("en-IN")}</td>
                                {total > 0 && (
                                    <td className="w-16 py-2.5 text-right tabular-nums text-muted">
                                        {Math.round((row.users / total) * 100)}%
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </article>
    );
}
