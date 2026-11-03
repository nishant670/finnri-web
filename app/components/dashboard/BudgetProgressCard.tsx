import { DashboardBudgetStatus } from "@/app/lib/api";
import { formatMoney, formatRupees } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";

const STATUS: Record<DashboardBudgetStatus["status"], { label: string; text: string; bar: string }> = {
    safe: { label: "On track", text: "text-positive", bar: "bg-positive" },
    watch: { label: "Close to limit", text: "text-warning", bar: "bg-warning" },
    exceeded: { label: "Over limit", text: "text-negative", bar: "bg-negative" },
};

/**
 * Where a monthly budget would land at today's pace. Early in the month a
 * single big spend would project wildly, so it waits for three days of data.
 */
export function projectedSpend(budget: DashboardBudgetStatus, daysInMonth: number): number | null {
    const elapsed = daysInMonth - budget.days_left;
    if (elapsed < 3 || budget.spent_amount <= 0) return null;
    return (budget.spent_amount / elapsed) * daysInMonth;
}

/** One budget as a row: spent of limit, a bar, what's left and the pace. */
export default function BudgetRow({ budget }: { budget: DashboardBudgetStatus }) {
    const status = STATUS[budget.status];
    const percentage = Math.max(0, budget.percentage);
    const rounded = Math.round(percentage);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = projectedSpend(budget, daysInMonth);
    const over = budget.remaining_amount < 0;

    return (
        <div className="px-4 py-3.5 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-semibold">{budget.name}<span className="font-normal text-muted"> · {budget.category || "All spending"}</span></p>
                <p className={cn("shrink-0 text-[15px] font-bold tabular-nums", status.text)}>{rounded}%</p>
            </div>
            <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-track"
                role="progressbar"
                aria-label={`${budget.name} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(percentage))}
                aria-valuetext={`${rounded}% used, ${status.label}`}
            >
                <div className={cn("h-full rounded-full", status.bar)} style={{ width: `${Math.min(100, percentage)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[13px] text-muted">
                <span><span className="font-semibold text-foreground tabular-nums">{formatMoney(budget.spent_amount)}</span> of {formatMoney(budget.limit_amount)} · {over ? <span className="font-semibold text-negative">{formatMoney(Math.abs(budget.remaining_amount))} over</span> : `${formatMoney(budget.remaining_amount)} left`}</span>
                <span>{projected !== null && !over ? `At this pace ${formatRupees(projected)} by month end · ` : ""}{budget.days_left} day{budget.days_left === 1 ? "" : "s"} left</span>
            </div>
        </div>
    );
}
