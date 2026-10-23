import Link from "next/link";
import { ChevronRight, Lightbulb, Siren } from "lucide-react";
import { DashboardInsight } from "@/app/lib/api";
import { formatDate, formatMoney } from "@/app/lib/format";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";

function insightHref(insight: DashboardInsight, period: { start_date: string; end_date: string }) {
    if (insight.budget_id) return "/dashboard/tools#budgets";
    return transactionHref({
        ...period,
        type: "expense",
        ...(insight.category ? { category: insight.category } : {}),
        ...(insight.merchant ? { q: insight.merchant } : {}),
        ...(insight.account_id ? { account_id: insight.account_id } : {}),
        ...(insight.kind === "unusual_spending" && insight.amount !== undefined ? { min_amount: insight.amount } : {}),
    });
}

/** The facts beside the amount, which sits on the title line instead. */
function supportingFacts(insight: DashboardInsight) {
    const facts: string[] = [];
    if (insight.transaction_count !== undefined) facts.push(`${insight.transaction_count} transaction${insight.transaction_count === 1 ? "" : "s"}`);
    if (insight.change_percentage !== undefined) facts.push(`${insight.change_percentage >= 0 ? "+" : ""}${Math.round(insight.change_percentage)}% change`);
    if (insight.percentage !== undefined) facts.push(`${Math.round(insight.percentage)}% ${insight.budget_id ? "used" : "share"}`);
    if (insight.limit_amount !== undefined) facts.push(`${formatMoney(insight.limit_amount)} limit`);
    if (insight.remaining_amount !== undefined) facts.push(`${formatMoney(insight.remaining_amount)} remaining`);
    if (insight.next_expected_date) facts.push(`Expected ${formatDate(insight.next_expected_date)}`);
    if (insight.confidence !== undefined) facts.push(`${Math.round(insight.confidence * 100)}% match`);
    return facts;
}

export default function DashboardInsightCard({
    insight,
    period,
    featured = false,
}: {
    insight: DashboardInsight;
    period: { start_date: string; end_date: string };
    featured?: boolean;
}) {
    const warning = insight.severity === "warning";
    const facts = supportingFacts(insight);
    const Icon = warning ? Siren : Lightbulb;

    return (
        <article className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", featured && "sm:p-5")}>
            <div className="flex items-start gap-3">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[10px]", warning ? "bg-warning-surface text-warning" : "bg-selected text-accent")}><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className={cn("font-bold", featured ? "text-lg" : "text-base")}>{insight.title}</h3>
                        {insight.amount !== undefined && <p className="shrink-0 text-base font-bold tabular-nums">{formatMoney(insight.amount)}</p>}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted">{insight.body}</p>
                </div>
            </div>

            {facts.length > 0 && <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">{facts.map((fact) => <span key={fact} className="rounded-full bg-track px-2.5 py-1 text-xs font-semibold text-muted">{fact}</span>)}</div>}

            {(insight.action_label || insight.explanation) && (
                <div className="mt-3 grid gap-x-6 gap-y-2 pl-[52px] sm:grid-cols-2">
                    {insight.action_label && <Link href={insightHref(insight, period)} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold hover:underline">{insight.action_label}<ChevronRight className="h-4 w-4" /></Link>}
                    {insight.explanation && (
                        <details className="text-sm">
                            <summary className="flex min-h-10 cursor-pointer list-none items-center font-bold text-muted hover:text-foreground">How this was calculated</summary>
                            <p className="mt-1 leading-5 text-muted">{insight.explanation}</p>
                        </details>
                    )}
                </div>
            )}
        </article>
    );
}
