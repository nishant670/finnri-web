"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Download, UserRound } from "lucide-react";
import DataTable from "@/app/components/admin/DataTable";
import IncludeTestToggle from "@/app/components/admin/IncludeTestToggle";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, AdminPage, withQuery } from "@/app/lib/admin-api";
import { useIncludeTest } from "@/app/lib/admin-test-users";
import SelectionBar, { SelectBox } from "@/app/components/admin/SelectionBar";
import BulkGiftDialog from "@/app/components/admin/BulkGiftDialog";
import { useUserSelection } from "@/app/lib/admin-selection";
import { formatDate } from "@/app/lib/format";

type TrialRow = {
    id: number;
    username: string;
    email?: string;
    is_guest: boolean;
    created_at: string;
    last_active_at?: string;
    trial_started_at?: string;
    trial_ends_at?: string;
    days_left?: number;
    trial_credits: number;
    trial_credits_left: number;
    ai_reads: number;
    entries_count: number;
    push_enabled: boolean;
    ever_paid: boolean;
    credit_limit_hit_at?: string;
    credit_limit_hits: number;
    statuses: string[];
};
type TrialsResponse = AdminPage<{
    status: string;
    days: number;
    counts: Record<string, number>;
    users: TrialRow[];
}>;

const tabs = [
    {
        code: "ending_soon",
        label: "Ending soon",
        hint: "Free trial ends within the chosen days. The moment to offer a pass.",
    },
    {
        code: "ended_active",
        label: "Ended, still using",
        hint: "Trial ended, never paid, and opened Finnri in the last 14 days. The warmest leads.",
    },
    {
        code: "ended_unpaid",
        label: "Ended, never paid",
        hint: "Every trial that ran out without a purchase.",
    },
    {
        code: "credit_limit",
        label: "Hit credit limit",
        hint: "An AI read was refused for lack of credits in the last 30 days.",
    },
    {
        code: "in_trial",
        label: "In trial",
        hint: "Everyone still inside the 30-day free trial.",
    },
] as const;
const dayOptions = [3, 7, 14, 30];
const pageSize = 50;

export default function AdminTrialsPage() {
    const [status, setStatus] = useState<string>("ending_soon");
    const [days, setDays] = useState(7);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<TrialsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);
    const [selectingAll, setSelectingAll] = useState(false);
    const [gifting, setGifting] = useState(false);
    const selection = useUserSelection();
    const { includeTest, setIncludeTest, includeTestParam } = useIncludeTest();
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setData(
                await AdminAPI.get<TrialsResponse>(
                    withQuery("trials", {
                        status,
                        days,
                        page,
                        page_size: pageSize,
                        include_test: includeTestParam,
                    }),
                ),
            );
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load trials");
        } finally {
            setLoading(false);
        }
    }, [status, days, page, includeTestParam]);
    useEffect(() => {
        void load();
    }, [load]);
    const active = tabs.find((tab) => tab.code === status) ?? tabs[0];
    // The CSV is the outreach list, so it holds the whole tab, not the page on
    // screen: read every page at the API's largest page size.
    async function loadWholeTab() {
        const rows: TrialRow[] = [];
        for (let next = 1; ; next++) {
            const chunk = await AdminAPI.get<TrialsResponse>(
                withQuery("trials", { status, days, page: next, page_size: 100, include_test: includeTestParam }),
            );
            rows.push(...chunk.users);
            if (chunk.users.length === 0 || rows.length >= chunk.total) break;
        }
        return rows;
    }
    async function selectWholeTab() {
        setSelectingAll(true);
        try {
            selection.addAll(await loadWholeTab());
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Couldn't select everyone");
        } finally {
            setSelectingAll(false);
        }
    }
    async function exportCSV() {
        if (!data) return;
        setExporting(true);
        let rows: TrialRow[] = [];
        try {
            rows = await loadWholeTab();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Export failed");
            return;
        } finally {
            setExporting(false);
        }
        const header = [
            "id",
            "username",
            "type",
            "trial_ends_at",
            "days_left",
            "trial_credits_left",
            "ai_reads",
            "entries",
            "last_active_at",
            "push_enabled",
            "credit_limit_hits",
        ];
        const lines = rows.map((row) =>
            [
                row.id,
                row.username,
                row.is_guest ? "guest" : "registered",
                row.trial_ends_at ?? "",
                row.days_left ?? "",
                row.trial_credits_left,
                row.ai_reads,
                row.entries_count,
                row.last_active_at ?? "",
                row.push_enabled,
                row.credit_limit_hits,
            ]
                .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                .join(","),
        );
        const blob = new Blob([[header.join(","), ...lines].join("\n")], {
            type: "text/csv;charset=utf-8",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `finnri-trials-${status}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
    if (loading && !data) return <PageSkeleton />;
    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="font-display text-[30px] font-bold leading-tight max-lg:sr-only sm:text-[34px]">Trials & sales</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        People to offer AI credits to. Anyone with a pass right now, gifted ones included, is left out. Guests can only be
                        reached by push.
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <IncludeTestToggle
                        value={includeTest}
                        onChange={(value) => {
                            setIncludeTest(value);
                            setPage(1);
                        }}
                    />
                    <button
                        onClick={() => void exportCSV()}
                        disabled={!data?.users.length || exporting || loading}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold disabled:opacity-40"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </header>
            <div role="group" aria-label="Trial lists" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-track p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.code}
                        onClick={() => {
                            setStatus(tab.code);
                            setPage(1);
                        }}
                        aria-pressed={status === tab.code}
                        className={`h-9 shrink-0 rounded-full px-3.5 text-sm transition ${
                            status === tab.code
                                ? "bg-card font-bold shadow-sm dark:bg-border"
                                : "font-medium text-muted hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                        <span className="ml-1.5 tabular-nums text-muted">{data?.counts?.[tab.code] ?? "–"}</span>
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm text-muted">{active.hint}</p>
                    {data && data.total > 0 && (
                        <button
                            onClick={() => void selectWholeTab()}
                            disabled={selectingAll}
                            className="text-sm font-bold text-accent disabled:opacity-50"
                        >
                            {selectingAll ? "Selecting…" : `Select all ${data.total.toLocaleString("en-IN")}`}
                        </button>
                    )}
                </div>
                {status === "ending_soon" && (
                    <label className="flex items-center gap-2 text-sm font-semibold">
                        Ends within
                        <select
                            value={days}
                            onChange={(event) => {
                                setDays(Number(event.target.value));
                                setPage(1);
                            }}
                            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
                        >
                            {dayOptions.map((value) => (
                                <option key={value} value={value}>
                                    {value} days
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
            {error && <div className="rounded-xl bg-negative/10 p-4 text-sm text-negative">{error}</div>}
            {data && data.users.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">
                    Nobody in this list right now.
                </div>
            ) : (
                <div aria-busy={loading} className={loading ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
                    <DataTable
                        rows={data?.users ?? []}
                        columns={[
                            {
                                key: "select",
                                label: (
                                    <SelectBox
                                        label="Select everyone on this page"
                                        checked={(data?.users.length ?? 0) > 0 && (data?.users ?? []).every((row) => selection.has(row.id))}
                                        indeterminate={
                                            (data?.users ?? []).some((row) => selection.has(row.id)) &&
                                            !(data?.users ?? []).every((row) => selection.has(row.id))
                                        }
                                        onChange={() => selection.togglePage(data?.users ?? [])}
                                    />
                                ),
                                className: "w-10",
                                render: (row) => (
                                    <SelectBox
                                        label={`Select ${row.username}`}
                                        checked={selection.has(row.id)}
                                        onChange={() => selection.toggle(row)}
                                    />
                                ),
                            },
                            {
                                key: "user",
                                label: "User",
                                render: (row) => (
                                    <Link href={`/admin/users/${row.id}`} className="flex items-center gap-3 font-bold hover:text-accent">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-selected text-accent">
                                            <UserRound className="h-4 w-4" />
                                        </span>
                                        <span>
                                            {row.username}
                                            <small className="mt-0.5 block font-normal text-muted">
                                                #{row.id} · {row.is_guest ? "Guest" : row.email || "Registered"}
                                            </small>
                                        </span>
                                    </Link>
                                ),
                            },
                            {
                                key: "trial",
                                label: "Trial",
                                render: (row) => <TrialCell row={row} />,
                            },
                            {
                                key: "credits",
                                label: "Trial credits left",
                                className: "text-right",
                                render: (row) =>
                                    row.trial_credits
                                        ? `${row.trial_credits_left.toLocaleString("en-IN")} / ${row.trial_credits.toLocaleString("en-IN")}`
                                        : "—",
                            },
                            {
                                key: "ai",
                                label: "AI reads",
                                className: "text-right",
                                render: (row) => row.ai_reads.toLocaleString("en-IN"),
                            },
                            {
                                key: "entries",
                                label: "Entries",
                                className: "text-right",
                                render: (row) => row.entries_count.toLocaleString("en-IN"),
                            },
                            {
                                key: "limit",
                                label: "Refused reads",
                                className: "text-right",
                                render: (row) => (row.credit_limit_hits ? row.credit_limit_hits : "—"),
                            },
                            {
                                key: "active",
                                label: "Last active",
                                render: (row) => <span className="text-muted">{formatDate(row.last_active_at)}</span>,
                            },
                            {
                                key: "push",
                                label: "Push",
                                render: (row) =>
                                    row.push_enabled ? (
                                        <span className="inline-flex items-center gap-1 text-positive">
                                            <BellRing className="h-4 w-4" /> On
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-muted">
                                            <BellOff className="h-4 w-4" /> Off
                                        </span>
                                    ),
                            },
                        ]}
                    />
                </div>
            )}
            {data && data.total > pageSize && (
                <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                        {data.total.toLocaleString("en-IN")} people · page {page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            className="min-h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page * pageSize >= data.total}
                            onClick={() => setPage((value) => value + 1)}
                            className="min-h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
            <SelectionBar count={selection.users.length} onGift={() => setGifting(true)} onClear={selection.clear} />
            <BulkGiftDialog
                open={gifting}
                users={selection.users}
                onClose={() => setGifting(false)}
                onDone={() => {
                    selection.clear();
                    void load();
                }}
            />
        </div>
    );
}

function TrialCell({ row }: { row: TrialRow }) {
    if (!row.trial_ends_at) return <span className="text-muted">No trial</span>;
    if (row.days_left !== undefined) {
        return (
            <span className="whitespace-nowrap">
                <span className={`font-bold ${row.days_left <= 3 ? "text-warning" : ""}`}>
                    {row.days_left === 1 ? "1 day left" : `${row.days_left} days left`}
                </span>
                <small className="mt-0.5 block text-muted">Ends {formatDate(row.trial_ends_at)}</small>
            </span>
        );
    }
    return (
        <span className="whitespace-nowrap">
            <span className="font-bold">Ended</span>
            <small className="mt-0.5 block text-muted">{formatDate(row.trial_ends_at)}</small>
        </span>
    );
}
