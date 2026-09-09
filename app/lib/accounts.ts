/**
 * Account types and their canonical payment modes live together so adding an
 * account type cannot silently fall through to an unrelated mode.
 *
 * PAYMENT_MODES mirrors `canonicalModes` in
 * finnri-api/internal/http/payment_modes.go and `PAYMENT_MODES` in
 * finnri-app/lib/payment-modes.ts. The web does not send an inferred mode for
 * recognised account types; the API derives it from account_id. This map tells
 * the form when derivation is possible and is the compile-time drift guard.
 */

export type AccountType = "cash" | "upi" | "bank" | "credit_card" | "debit_card" | "wallet" | "other";

export const PAYMENT_MODES = ["Cash", "Bank Account", "UPI", "Credit Card", "Wallets"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const ACCOUNT_TYPES: ReadonlyArray<{ value: AccountType; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "bank", label: "Bank account" },
    { value: "credit_card", label: "Credit card" },
    { value: "debit_card", label: "Debit card" },
    { value: "wallet", label: "Wallet" },
    { value: "other", label: "Other" },
];

export const ACCOUNT_PAYMENT_MODES: Readonly<Record<AccountType, PaymentMode | null>> = {
    cash: "Cash",
    upi: "UPI",
    bank: "Bank Account",
    credit_card: "Credit Card",
    // A debit card draws directly from its bank account. The linked account
    // retains the more specific debit-card identity for account-level reports.
    debit_card: "Bank Account",
    wallet: "Wallets",
    // "Other" has no honest inference. The form asks the user explicitly.
    other: null,
};

export function paymentModeForAccountType(accountType: AccountType): PaymentMode | null {
    return ACCOUNT_PAYMENT_MODES[accountType];
}

export function resolvePaymentMode(value: string | null | undefined): PaymentMode | null {
    const normalized = value?.trim().toLowerCase();
    return PAYMENT_MODES.find((mode) => mode.toLowerCase() === normalized) || null;
}

export function creditCardPosition(outstanding: number | null | undefined) {
    const amount = Number.isFinite(outstanding) ? outstanding as number : 0;
    return amount < 0
        ? { label: "In credit", displayAmount: Math.abs(amount), owedAmount: 0 }
        : { label: "Outstanding", displayAmount: amount, owedAmount: amount };
}
