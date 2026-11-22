"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Gift, X } from "lucide-react";
import Dialog from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/Toast";
import { AdminAPI, AdminAPIError } from "@/app/lib/admin-api";
import type { SelectedUser } from "@/app/lib/admin-selection";

type Plan = { code: string; name: string; billing_interval: string; included_credits: number };
type Result = { user_id: number; status: string; reason?: string };
type Response = { results: Result[]; counts: Record<string, number> };

// Plans with a fixed period, how long one period is, and what it's called.
const periodUnits: Record<string, { days: number; one: string; many: string }> = {
    weekly: { days: 7, one: "week", many: "weeks" },
    monthly: { days: 30, one: "month", many: "months" },
    quarterly: { days: 91, one: "quarter", many: "quarters" },
    yearly: { days: 365, one: "year", many: "years" },
};
const maxUsers = 500;
const maxCredits = 10000;
const statusLabels: Record<string, string> = {
    gifted: "Gifted",
    credits_instead: "Guests given credits instead",
    already_gifted: "Already gifted in this batch",
    skipped: "Skipped",
    failed: "Failed — retry to finish",
};
const reasonLabels: Record<string, string> = {
    user_not_found: "account no longer exists",
    guest_without_device: "guest with no device to hold credits",
    guest_cannot_hold_pass: "guest, and this plan carries no credits",
    gift_failed: "server error",
};

// Gift one pass or a credit amount to everyone selected, in one go.
export default function BulkGiftDialog({
    open,
    users,
    onClose,
    onDone,
}: {
    open: boolean;
    users: SelectedUser[];
    onClose: () => void;
    onDone: () => void;
}) {
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [kind, setKind] = useState<"pass" | "credits">("pass");
    const [planCode, setPlanCode] = useState("");
    const [periods, setPeriods] = useState(1);
    const [credits, setCredits] = useState(500);
    const [expiry, setExpiry] = useState("");
    const [note, setNote] = useState("");
    const [customMessage, setCustomMessage] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [key, setKey] = useState("");
    const [step, setStep] = useState<"form" | "confirm" | "done">("form");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [response, setResponse] = useState<Response | null>(null);

    useEffect(() => {
        if (!open) return;
        AdminAPI.get<{ plans: Plan[] }>("plans")
            .then((result) => {
                const giftable = result.plans.filter((plan) => plan.billing_interval in periodUnits);
                setPlans(giftable);
                setPlanCode(
                    (current) => current || giftable.find((plan) => plan.billing_interval === "weekly")?.code || giftable[0]?.code || "",
                );
            })
            .catch(() => setError("Couldn't load plans."));
    }, [open]);

    // Changing what's gifted makes it a new batch. The key survives only a
    // retry of the same gift, so a failed send can be finished, not doubled.
    const changed =
        <T,>(setter: (value: T) => void) =>
        (value: T) => {
            setKey("");
            setter(value);
        };
    const plan = plans.find((item) => item.code === planCode);
    const unit = plan ? periodUnits[plan.billing_interval] : undefined;
    const guests = users.filter((user) => user.is_guest).length;
    const length = unit ? `${periods} ${periods === 1 ? unit.one : unit.many}` : "";
    const guestCredits = (plan?.included_credits ?? 0) * periods;
    const tooMany = users.length > maxUsers;
    const messageOk = !customMessage || (title.trim() !== "" && body.trim() !== "");
    const giftOk = kind === "pass" ? Boolean(plan) && periods >= 1 && periods <= 12 : credits >= 1 && credits <= maxCredits;
    const ready = users.length > 0 && !tooMany && note.trim() !== "" && messageOk && giftOk;

    const summary = useMemo(() => {
        const people = `${users.length.toLocaleString("en-IN")} ${users.length === 1 ? "person" : "people"}`;
        if (kind === "credits") {
            return `${credits.toLocaleString("en-IN")} AI credits to ${people}${expiry ? `, valid until ${formatDay(expiry)}` : ", with no expiry"}.`;
        }
        return `${plan?.name ?? "A pass"} for ${length} to ${people}.`;
    }, [credits, expiry, kind, length, plan, users.length]);

    function reset() {
        setStep("form");
        setResponse(null);
        setError("");
        setKey("");
    }
    function close() {
        if (busy) return;
        if (step === "done") onDone();
        reset();
        onClose();
    }
    async function send() {
        setBusy(true);
        setError("");
        try {
            const result = await AdminAPI.post<Response>(
                "gifts/bulk",
                {
                    user_ids: users.map((user) => user.id),
                    kind,
                    plan_code: kind === "pass" ? planCode : undefined,
                    periods: kind === "pass" ? periods : undefined,
                    credits: kind === "credits" ? credits : undefined,
                    // The picked day lasts to its end, India time.
                    expires_at: kind === "credits" && expiry ? new Date(`${expiry}T23:59:59+05:30`).toISOString() : undefined,
                    note: note.trim(),
                    message: customMessage ? { title: title.trim(), body: body.trim() } : undefined,
                },
                { "Idempotency-Key": key },
            );
            setResponse(result);
            setStep("done");
            const given = (result.counts.gifted ?? 0) + (result.counts.credits_instead ?? 0);
            toast({
                title: "Gifts sent",
                description: `${given.toLocaleString("en-IN")} of ${users.length.toLocaleString("en-IN")} people received a gift.`,
            });
        } catch (reason) {
            setError(describeError(reason));
            setStep("form");
        } finally {
            setBusy(false);
        }
    }

    const input = "min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm";
    return (
        <Dialog open={open} onClose={close} labelledBy="bulk-gift-title" panelClassName="sm:max-w-lg">
            <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="bulk-gift-title" className="text-xl font-bold">
                            Gift {users.length.toLocaleString("en-IN")} {users.length === 1 ? "person" : "people"}
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                            {guests > 0 ? `${guests} guest${guests === 1 ? "" : "s"} · ` : ""}Everyone is notified in the app and by push.
                        </p>
                    </div>
                    <button onClick={close} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-track">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {step === "done" && response ? (
                    <Results response={response} total={users.length} />
                ) : step === "confirm" ? (
                    <div className="mt-6 space-y-4">
                        <p className="rounded-2xl bg-track p-4 text-sm font-semibold">{summary}</p>
                        {kind === "pass" && guests > 0 && (
                            <p className="text-sm text-muted">
                                {guestCredits > 0
                                    ? `Guests can't hold a pass, so the ${guests} guest${guests === 1 ? "" : "s"} get ${guestCredits.toLocaleString("en-IN")} AI credits for ${length} instead.`
                                    : `This plan carries no credits, so the ${guests} guest${guests === 1 ? "" : "s"} will be skipped.`}
                            </p>
                        )}
                        <p className="text-sm text-muted">
                            Note for the audit log: “{note.trim()}”.{" "}
                            {customMessage ? `They'll see “${title.trim()}”.` : "They'll see the standard gift message."}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                disabled={busy}
                                onClick={() => setStep("form")}
                                className="min-h-11 rounded-full border border-border px-5 text-sm font-bold"
                            >
                                Back
                            </button>
                            <button
                                disabled={busy}
                                onClick={() => void send()}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-60"
                            >
                                <Gift className="h-4 w-4" />
                                {busy ? "Sending…" : "Send gifts"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        <div role="radiogroup" aria-label="What to gift" className="grid grid-cols-2 gap-2 rounded-2xl bg-track p-1">
                            {(
                                [
                                    ["pass", "Free pass", Gift],
                                    ["credits", "AI credits", Coins],
                                ] as const
                            ).map(([value, label, Icon]) => (
                                <button
                                    key={value}
                                    role="radio"
                                    aria-checked={kind === value}
                                    onClick={() => changed(setKind)(value)}
                                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm ${kind === value ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted"}`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {kind === "pass" ? (
                            <div className="grid grid-cols-[1fr_auto] gap-3">
                                <label className="text-xs font-bold text-muted">
                                    Plan
                                    <select
                                        value={planCode}
                                        onChange={(event) => changed(setPlanCode)(event.target.value)}
                                        className={`${input} mt-1.5 font-semibold text-foreground`}
                                    >
                                        {plans.map((item) => (
                                            <option key={item.code} value={item.code}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs font-bold text-muted">
                                    {unit ? unit.many.charAt(0).toUpperCase() + unit.many.slice(1) : "Periods"}
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={periods}
                                        onChange={(event) => changed(setPeriods)(Number(event.target.value))}
                                        className={`${input} mt-1.5 w-24 text-foreground`}
                                    />
                                </label>
                                {plan && (
                                    <p className="col-span-2 text-xs text-muted">
                                        Each pass includes {(plan.included_credits * periods).toLocaleString("en-IN")} AI credits and starts
                                        when any pass they already have ends.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <label className="text-xs font-bold text-muted">
                                    Credits each
                                    <input
                                        type="number"
                                        min={1}
                                        max={maxCredits}
                                        value={credits}
                                        onChange={(event) => changed(setCredits)(Number(event.target.value))}
                                        className={`${input} mt-1.5 text-foreground`}
                                    />
                                </label>
                                <label className="text-xs font-bold text-muted">
                                    Valid until (optional)
                                    <input
                                        type="date"
                                        value={expiry}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(event) => changed(setExpiry)(event.target.value)}
                                        className={`${input} mt-1.5 text-foreground`}
                                    />
                                </label>
                            </div>
                        )}

                        <label className="block text-xs font-bold text-muted">
                            Note for the audit log
                            <input
                                value={note}
                                maxLength={200}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="e.g. Diwali 2026 free week"
                                className={`${input} mt-1.5 text-foreground`}
                            />
                        </label>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold">
                                <input
                                    type="checkbox"
                                    checked={customMessage}
                                    onChange={(event) => setCustomMessage(event.target.checked)}
                                    className="h-4 w-4 accent-[var(--accent)]"
                                />
                                Write the notification they get
                            </label>
                            {customMessage && (
                                <div className="mt-3 space-y-2">
                                    <input
                                        value={title}
                                        maxLength={65}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="Happy Diwali from Finnri"
                                        aria-label="Notification title"
                                        className={input}
                                    />
                                    <textarea
                                        value={body}
                                        maxLength={240}
                                        rows={3}
                                        onChange={(event) => setBody(event.target.value)}
                                        placeholder="A free week of AI credits is yours. Scan a bill or speak an expense to use them."
                                        aria-label="Notification message"
                                        className={`${input} py-3`}
                                    />
                                    <p className="text-right text-xs text-muted">{body.length}/240</p>
                                </div>
                            )}
                        </div>

                        {tooMany && <p className="text-sm text-negative">Pick at most {maxUsers} people at a time.</p>}
                        {error && <p className="rounded-xl bg-negative/10 p-3 text-sm text-negative">{error}</p>}
                        <div className="flex justify-end">
                            <button
                                disabled={!ready}
                                onClick={() => {
                                    // One key per confirmed batch: a retry or double-click gifts nobody twice.
                                    setKey((current) => current || crypto.randomUUID());
                                    setStep("confirm");
                                }}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-on-accent disabled:opacity-40"
                            >
                                Review gift
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
}

function Results({ response, total }: { response: Response; total: number }) {
    const problems = response.results.filter((result) => result.status === "skipped" || result.status === "failed");
    return (
        <div className="mt-6 space-y-3">
            {Object.keys(statusLabels)
                .filter((status) => response.counts[status])
                .map((status) => [status, response.counts[status]] as const)
                .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between rounded-xl bg-track px-4 py-2.5 text-sm">
                        <span className="font-semibold">{statusLabels[status] ?? status}</span>
                        <span className="tabular-nums">{count.toLocaleString("en-IN")}</span>
                    </div>
                ))}
            {problems.length > 0 && (
                <details className="text-sm">
                    <summary className="cursor-pointer font-semibold">Who wasn&rsquo;t gifted</summary>
                    <ul className="mt-2 space-y-1 text-muted">
                        {problems.map((result) => (
                            <li key={result.user_id}>
                                #{result.user_id} — {reasonLabels[result.reason ?? ""] ?? result.reason ?? result.status}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            <p className="text-xs text-muted">{total.toLocaleString("en-IN")} people in this batch.</p>
        </div>
    );
}

function formatDay(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function describeError(reason: unknown) {
    if (reason instanceof AdminAPIError && reason.payload && typeof reason.payload === "object") {
        const fields = (reason.payload as { fields?: Record<string, string> }).fields;
        if (fields)
            return Object.entries(fields)
                .map(([field, problem]) => `${field.replaceAll("_", " ")} ${problem}`)
                .join("; ");
    }
    return reason instanceof Error ? reason.message : "Gifting failed.";
}
