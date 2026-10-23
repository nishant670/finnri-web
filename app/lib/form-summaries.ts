/**
 * One-line read-backs for the optional settings a form folds away.
 *
 * A folded section is only safe to leave closed if the row that hides it says
 * what is inside — "Reminder 3 days before · Autopay off" rather than
 * "Advanced". These are kept out of the components so the wording can be
 * tested without a DOM, and so the web and its tests agree on one sentence.
 */

export function reminderPhrase(days: number): string {
    if (!Number.isFinite(days) || days <= 0) return "Reminder on the due date";
    return `Reminder ${days} day${days === 1 ? "" : "s"} before`;
}

export type SubscriptionOptionsSummaryInput = {
    category: string;
    billingInterval: string;
    reminderDays: number;
    autopay: boolean;
    accountName?: string;
    cancelBeforeDue: boolean;
    merchant?: string;
    name?: string;
};

export function subscriptionOptionsSummary(input: SubscriptionOptionsSummaryInput): string {
    const daily = input.billingInterval === "daily" || input.billingInterval === "business_daily";
    const merchant = input.merchant?.trim();
    return [
        merchant && merchant !== input.name?.trim() ? `Paid to ${merchant}` : "",
        input.category || "Uncategorised",
        daily ? "Added automatically" : reminderPhrase(input.reminderDays),
        input.autopay ? `Autopay${input.accountName ? ` from ${input.accountName}` : " on"}` : "Autopay off",
        input.cancelBeforeDue ? "Cancel reminder on" : "",
    ]
        .filter(Boolean)
        .join(" · ");
}

export type AccountDetailsSummaryInput = {
    type: string;
    provider: string;
    identifier: string;
    balance: number;
    isDefault: boolean;
    formatMoney: (value: number) => string;
};

/** What the account dialog's "More details" holds, or an invitation when empty. */
export function accountDetailsSummary(input: AccountDetailsSummaryInput): string {
    const parts = [
        input.provider.trim(),
        input.identifier.trim() ? `•• ${input.identifier.trim().slice(-4)}` : "",
        input.balance ? `${input.type === "credit_card" ? "Owed" : "Balance"} ${input.formatMoney(input.balance)}` : "",
        input.isDefault ? "Default account" : "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Optional — bank, last 4 digits, balance and colour";
}
