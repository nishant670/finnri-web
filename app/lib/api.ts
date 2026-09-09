import axios, { AxiosError } from "axios";
import type { AccountType, PaymentMode } from "@/app/lib/accounts";

export interface User {
    id: number;
    uuid: string;
    username: string;
    email?: string;
    phone?: string;
    is_guest: boolean;
    has_pin: boolean;
    device_id?: string;
    biometrics_enabled: boolean;
    created_at?: string;
}

export interface AuthResponse {
    token: string;
    expires_at?: string;
    user: User;
}

export interface Account {
    id: number;
    user_id: number;
    type: AccountType;
    name: string;
    color: string;
    provider: string;
    identifier: string;
    credit_limit: number;
    due_day: number;
    fee_month: string;
    balance: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
    summary?: AccountSummary;
}

export interface AccountSummary {
    spent_this_month: number;
    received_this_month: number;
    entries_this_month: number;
    lifetime_spent: number;
    lifetime_received: number;
    entries_total: number;
    last_activity_date?: string;
    outstanding?: number;
    credit_utilisation?: number;
    running_balance?: number;
    limit?: {
        outstanding: number;
        outstanding_source: "statement" | "ledger";
        emi_blocked_principal: number;
        credit_limit: number;
        available_limit?: number;
        utilisation_pct?: number;
    };
}

export type AccountInput = Omit<Account, "id" | "user_id" | "created_at" | "updated_at">;

export interface Transaction {
    id: number;
    user_id: number;
    title: string;
    amount: number;
    currency: string;
    source: "manual" | "text" | "voice";
    type: "income" | "expense";
    category: string;
    mode: PaymentMode;
    date: string;
    time?: string;
    merchant?: string;
    tags: string[];
    notes?: string;
    source_text?: string;
    account_id: number;
    account?: Account;
    category_suggestions?: string[];
    created_at: string;
    updated_at?: string;
}

export interface EntryListResponse {
    entries: Transaction[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface EntryListParams {
    page?: number;
    page_size?: number;
    type?: "expense" | "income";
    category?: string;
    account_id?: number;
    min_amount?: number;
    max_amount?: number;
    start_date?: string;
    end_date?: string;
    tag?: string;
    q?: string;
}

export interface TransactionInput {
    title: string;
    type: "income" | "expense";
    amount: number;
    currency: "INR";
    source: "manual" | "text" | "voice";
    // Omit for recognised account types; the API derives the canonical mode
    // from account_id. "Other" accounts must send the user's explicit choice.
    mode?: PaymentMode;
    category: string;
    merchant?: string;
    tags?: string[];
    notes?: string;
    date: string;
    time?: string;
    source_text?: string;
    account_id: number;
    split?: EntrySplitInput | null;
}

export type SplitDirection = "friend_owes_user" | "user_owes_friend";
export type SettlementDirection = "friend_paid_user" | "user_paid_friend";

export interface SplitFriend {
    id: number;
    user_id: number;
    name: string;
    email: string;
    phone: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface SplitGroupMember {
    id: number;
    friend_id: number;
    friend: SplitFriend;
}

export interface SplitGroup {
    id: number;
    user_id: number;
    name: string;
    archived: boolean;
    members: SplitGroupMember[];
    created_at: string;
    updated_at: string;
}

export interface SplitInvitePreview {
    token: string;
    group_id: number;
    group_name: string;
    owner_name: string;
    member_count: number;
    status: string;
    expires_at?: string | null;
}

export interface SplitParticipant {
    id: number;
    friend_id: number;
    friend: SplitFriend;
    share_amount: number;
    direction: SplitDirection;
}

export interface SplitBill {
    id: number;
    user_id: number;
    entry_id?: number | null;
    group_id?: number | null;
    group?: SplitGroup | null;
    title: string;
    total_amount: number;
    currency: "INR";
    date: string;
    notes: string;
    participants: SplitParticipant[];
    created_at: string;
    updated_at: string;
}

export interface SplitSettlement {
    id: number;
    user_id: number;
    friend_id: number;
    friend: SplitFriend;
    amount: number;
    direction: SettlementDirection;
    date: string;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface SplitBalance {
    friend: SplitFriend;
    total_owed_by_friend: number;
    total_owed_to_friend: number;
    net_balance: number;
}

export interface SplitActivityItem {
    id: string;
    type: "bill" | "settlement" | "friend_created" | "group_created";
    record_id: number;
    title: string;
    date: string;
    amount?: number;
    group_id?: number;
    group?: SplitGroup;
    friend_id?: number;
    friend?: SplitFriend;
    direction?: SplitDirection | SettlementDirection;
    participant_count?: number;
    participants?: SplitParticipant[];
    notes?: string;
    created_at: string;
}

export interface SplitActivityResponse {
    items: SplitActivityItem[];
    page: number;
    page_size: number;
    total: number;
}

export interface SplitFriendInput { name: string; email: string; phone: string; }
export interface SplitGroupInput { name: string; friend_ids: number[]; }
export interface SplitParticipantInput { friend_id: number; share_amount: number; direction: SplitDirection; }
export interface SplitBillInput {
    entry_id?: number | null;
    group_id?: number | null;
    title: string;
    total_amount: number;
    currency: "INR";
    date: string;
    notes: string;
    participants: SplitParticipantInput[];
}
export interface SplitSettlementInput { friend_id: number; amount: number; direction: SettlementDirection; date: string; notes: string; }
export interface EntrySplitParticipantInput {
    friend_id?: number;
    friend?: SplitFriendInput;
    share_amount: number;
    direction: SplitDirection;
}
export interface EntrySplitInput {
    group_id?: number;
    group_name?: string;
    notes?: string;
    participants: EntrySplitParticipantInput[];
}

export interface ParsedTransaction {
    stage?: "draft";
    title?: string;
    type?: "income" | "expense";
    amount?: number;
    currency?: string;
    source?: string;
    mode?: string;
    category?: string;
    merchant?: string;
    tags?: string[];
    note?: string;
    date?: string;
    time?: string;
    account_hint?: string;
    source_text?: string;
    confidence?: Record<string, number>;
    needs_confirmation?: Record<string, boolean>;
    missing_fields?: string[];
    clarifications?: string[];
}

export interface DashboardSummary {
    total_spent: number;
    total_income: number;
    daily_average: number;
    transaction_count: number;
}

export interface DashboardCategory {
    category: string;
    amount: number;
    percentage: number;
    change: number;
}

export interface DashboardMerchant {
    merchant: string;
    amount: number;
    transaction_count: number;
}

export interface DashboardAccountSpend {
    account_id: number | null;
    account_name: string;
    amount: number;
    percentage: number;
}

export interface DashboardBudgetStatus {
    budget_id: number;
    name: string;
    category: string;
    limit_amount: number;
    spent_amount: number;
    remaining_amount: number;
    percentage: number;
    alert_threshold_percent: number;
    days_left: number;
    status: "safe" | "watch" | "exceeded";
}

export interface DashboardDailySpend {
    date: string;
    amount: number;
    count: number;
}

export interface DashboardInsight {
    kind: string;
    severity: "info" | "warning" | "success";
    title: string;
    body: string;
    explanation?: string;
    action_label?: string;
    category?: string;
    merchant?: string;
    budget_id?: number;
    account_id?: number | null;
    account_name?: string;
    amount?: number;
    limit_amount?: number;
    remaining_amount?: number;
    status?: string;
    percentage?: number;
    change_percentage?: number;
    transaction_count?: number;
    next_expected_date?: string;
    confidence?: number;
}

export interface RecurringCandidate {
    candidate_key: string;
    label: string;
    merchant: string;
    category: string;
    average_amount: number;
    interval_guess: string;
    confidence: number;
    occurrences: number;
    last_seen_date: string;
    next_expected_date: string;
    review_due: boolean;
}

export interface RecurringCandidateDecision {
    id: number;
    user_id: number;
    candidate_key: string;
    merchant: string;
    category: string;
    decision: "dismissed" | "snoozed" | "tracked";
    snoozed_until?: string;
    last_reviewed_at: string;
    created_at: string;
    updated_at: string;
}

export interface DashboardResponse {
    period: { start: string; end: string };
    summary: DashboardSummary;
    top_categories: DashboardCategory[];
    top_merchants: DashboardMerchant[];
    account_spending: DashboardAccountSpend[];
    budget_statuses: DashboardBudgetStatus[];
    daily_spending: DashboardDailySpend[];
    recent_transactions: Transaction[];
    review_items: Transaction[];
    insights: DashboardInsight[];
    recurring_candidates: RecurringCandidate[];
}

export interface TransactionReportSummary {
    total_expense: number;
    total_income: number;
    net_cashflow: number;
    transaction_count: number;
    expense_count: number;
    income_count: number;
}

export interface TransactionReportBreakdown {
    key: string;
    label: string;
    amount: number;
    percentage: number;
    transaction_count: number;
}

export interface TransactionAccountReportBreakdown {
    account_id: number | null;
    account_name: string;
    amount: number;
    percentage: number;
    transaction_count: number;
}

export interface TransactionMonthlyReportBreakdown {
    month: string;
    expense: number;
    income: number;
    net_cashflow: number;
    transaction_count: number;
}

export interface TransactionTypeReportBreakdown {
    type: "expense" | "income";
    amount: number;
    transaction_count: number;
}

export interface TransactionReportResponse {
    summary: TransactionReportSummary;
    by_category: TransactionReportBreakdown[];
    by_merchant: TransactionReportBreakdown[];
    by_account: TransactionAccountReportBreakdown[];
    by_month: TransactionMonthlyReportBreakdown[];
    by_type: TransactionTypeReportBreakdown[];
}

export interface Budget {
    id: number;
    user_id: number;
    name: string;
    period: "monthly";
    category: string;
    limit_amount: number;
    currency: "INR";
    alert_threshold_percent: number;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export type BudgetInput = Omit<Budget, "id" | "user_id" | "created_at" | "updated_at">;

export interface Subscription {
    id: number;
    user_id: number;
    account_id?: number | null;
    account?: Account;
    name: string;
    merchant: string;
    category: string;
    amount: number;
    currency: "INR";
    billing_interval: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
    next_due_date: string;
    last_charged_date: string;
    status: "active" | "paused" | "cancelled";
    reminder_days: number;
    cancel_before_due: boolean;
    cancel_on_date: string;
    autopay: boolean;
    payment_mode: string;
    transaction_tag: string;
    purpose_type: string;
    notes: string;
    days_until_due: number;
    due_state: "scheduled" | "due_soon" | "overdue" | "paused" | "cancelled" | "unknown";
    created_at: string;
    updated_at: string;
}

export type SubscriptionInput = Omit<
    Subscription,
    "id" | "user_id" | "account" | "days_until_due" | "due_state" | "created_at" | "updated_at"
>;

// `POST /v1/tools/emi/calculate` is still the mobile app's EMI engine
// (finnri-app/lib/emi.ts). The web computes EMI in app/lib/calculators.ts
// instead, so it carries no client for that route; both are pinned to the
// same fixture so the two platforms cannot drift.

export interface AppNotification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    body: string;
    action_url?: string;
    read_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationListResponse {
    notifications: AppNotification[];
    unread_count: number;
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface CategoriesResponse {
    categories: string[];
    default: string;
    income_categories: string[];
    income_default: string;
}

export interface EntitlementPayload {
    error?: string;
    feature_code?: string;
    feature_label?: string;
    required_plan?: string;
    required_credits?: number;
    available_credits?: number;
    daily_limit_remaining?: number;
    reset_at?: string;
    upgrade_required?: boolean;
}

export class EntitlementError extends Error {
    readonly status: 402 | 403 | 429;
    readonly code?: string;
    readonly featureCode?: string;
    readonly featureLabel?: string;
    readonly requiredPlan?: string;
    readonly requiredCredits?: number;
    readonly availableCredits?: number;
    readonly dailyLimitRemaining?: number;
    readonly resetAt?: string;
    readonly upgradeRequired: boolean;

    constructor(status: 402 | 403 | 429, payload: EntitlementPayload = {}) {
        super(status === 429 ? "Allowance temporarily exhausted" : "This feature needs a different plan");
        this.name = "EntitlementError";
        this.status = status;
        this.code = payload.error;
        this.featureCode = payload.feature_code;
        this.featureLabel = payload.feature_label;
        this.requiredPlan = payload.required_plan;
        this.requiredCredits = payload.required_credits;
        this.availableCredits = payload.available_credits;
        this.dailyLimitRemaining = payload.daily_limit_remaining;
        this.resetAt = payload.reset_at;
        this.upgradeRequired = payload.upgrade_required ?? status !== 429;
    }
}

export class SessionExpiredError extends Error {
    constructor() {
        super("Your session expired");
        this.name = "SessionExpiredError";
    }
}

export const AUTH_SESSION_EXPIRED_EVENT = "finnri:session-expired";

export function asEntitlementError(error: unknown): EntitlementError | null {
    return error instanceof EntitlementError ? error : null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("finnri_token");
        if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const isAuthenticationRequest = error.config?.url?.startsWith("/v1/auth/");
        if (error.response?.status === 401 && !isAuthenticationRequest && typeof window !== "undefined") {
            const hadSession = Boolean(localStorage.getItem("finnri_token") || localStorage.getItem("finnri_user"));
            localStorage.removeItem("finnri_token");
            localStorage.removeItem("finnri_user");
            if (hadSession) window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
            return Promise.reject(new SessionExpiredError());
        }
        const status = error.response?.status;
        const entitlementPayload = (error.response?.data || {}) as EntitlementPayload;
        const isEntitlementResponse = status === 402
            || (status === 403 && Boolean(entitlementPayload.feature_code || entitlementPayload.required_plan || entitlementPayload.upgrade_required))
            || (status === 429 && Boolean(entitlementPayload.reset_at));
        if (isEntitlementResponse && (status === 402 || status === 403 || status === 429)) {
            return Promise.reject(new EntitlementError(
                status,
                entitlementPayload,
            ));
        }
        return Promise.reject(error);
    },
);

/**
 * Whether the request never got an answer at all — the device is offline, DNS
 * failed, the API is down, or CORS rejected the response before the browser
 * would hand it over.
 *
 * The distinction matters wherever a page would otherwise report a transient
 * outage as a permanent verdict. `/invite/split/[token]` is the case that
 * forced this out: a failed preview used to read "this invite is no longer
 * available", which tells the recipient of a perfectly good link to stop
 * trying.
 */
export function isApiUnreachable(error: unknown) {
    return axios.isAxiosError(error) && !error.response;
}

export function apiErrorMessage(error: unknown, fallback: string) {
    if (error instanceof SessionExpiredError) return "";
    if (error instanceof EntitlementError) {
        if (error.status === 429) return error.resetAt ? "Your allowance will be available again at the time shown." : "Your daily allowance will be available again soon.";
        return error.requiredPlan ? `${error.featureLabel || "This feature"} is included with ${error.requiredPlan}.` : `${error.featureLabel || "This feature"} is not included in this workspace.`;
    }
    if (!axios.isAxiosError(error)) return fallback;
    if (!error.response) {
        // This used to tell the reader to confirm the backend was running and
        // allowed this web address. That is a note to whoever wrote the page,
        // and `/pay` and the split-invite page both put it in front of members
        // of the public — one of them mid-payment. The operational detail is
        // still worth having, so it stays outside production.
        return process.env.NODE_ENV === "production"
            ? "Finnri could not be reached. Check your connection and try again."
            : "No response from the FINNRI API. Confirm the backend is running and that ALLOW_ORIGINS includes this web address.";
    }
    const payload = error.response?.data as { message?: string; fields?: Record<string, string> } | undefined;
    const fieldMessage = payload?.fields ? Object.values(payload.fields)[0] : undefined;
    return payload?.message || fieldMessage || fallback;
}

export const AuthAPI = {
    loginGuest: (deviceId?: string) => api.post<AuthResponse>("/v1/auth/guest", { device_id: deviceId }),
    loginGoogle: (payload: { id_token: string; nonce?: string; guest_uuid?: string; device_id?: string; biometrics_enabled?: boolean }) =>
        api.post<AuthResponse>("/v1/auth/google", payload),
    identify: (identifier: string) => api.post<{ exists: boolean; is_guest?: boolean }>("/v1/auth/identify", { identifier }),
    sendOTP: (identifier: string) => api.post<{ message: string; expires_at: string; dev_otp?: string }>("/v1/auth/otp/send", { identifier }),
    verifyOTP: (identifier: string, otp: string) => api.post<{ claim_token: string }>("/v1/auth/otp/verify", { identifier, otp }),
    register: (payload: { claim_token: string; pin: string; guest_uuid?: string; device_id?: string; biometrics_enabled: boolean }) =>
        api.post<AuthResponse>("/v1/auth/register", payload),
    login: (payload: { identifier: string; pin: string; device_id?: string }) => api.post<AuthResponse>("/v1/auth/login", payload),
    resetPIN: (payload: { claim_token: string; pin: string; device_id?: string; biometrics_enabled?: boolean }) =>
        api.post<AuthResponse>("/v1/auth/pin/reset", payload),
    logout: (token?: string) => api.post<{ message: string }>("/v1/auth/logout", undefined, token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined),
    revokeAllSessions: () => api.post<{ message: string; revoked: number }>("/v1/auth/sessions/revoke-all"),
};

export const EntriesAPI = {
    list: (params?: EntryListParams) => api.get<EntryListResponse>("/v1/entries", { params }),
    get: (id: number) => api.get<Transaction>(`/v1/entries/${id}`),
    exportCSV: (params?: EntryListParams) => api.get<Blob>("/v1/entries/export", {
        params: { ...params, format: "csv" },
        responseType: "blob",
    }),
    create: (data: TransactionInput) => api.post<Transaction>("/v1/entries", data),
    parse: (formData: FormData) => api.post<ParsedTransaction>("/v1/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    update: (id: number, data: TransactionInput) => api.put<Transaction>(`/v1/entries/${id}`, data),
    delete: (id: number) => api.delete(`/v1/entries/${id}`),
};

export const CategoriesAPI = {
    list: () => api.get<CategoriesResponse>("/v1/categories"),
};

export const DashboardAPI = {
    get: (params?: { start_date?: string; end_date?: string; tz?: string }) =>
        api.get<DashboardResponse>("/v1/dashboard", { params }),
};

export const RecurringCandidatesAPI = {
    saveDecision: (data: {
        candidate_key: string;
        merchant?: string;
        category?: string;
        decision: "dismissed" | "snoozed" | "tracked";
        snoozed_until?: string;
    }) => api.post<RecurringCandidateDecision>("/v1/recurring-candidates/decision", data),
};

export const ReportsAPI = {
    transactionSummary: (params?: EntryListParams) =>
        api.get<TransactionReportResponse>("/v1/reports/transactions/summary", { params }),
};

export const AccountsAPI = {
    list: (tz?: string) => api.get<Account[]>("/v1/accounts", { params: tz ? { tz } : undefined }),
    create: (data: AccountInput) => api.post<Account>("/v1/accounts", data),
    update: (id: number, data: AccountInput) => api.put<Account>(`/v1/accounts/${id}`, data),
    delete: (id: number) => api.delete(`/v1/accounts/${id}`),
};

export const BudgetsAPI = {
    list: () => api.get<Budget[]>("/v1/budgets"),
    create: (data: BudgetInput) => api.post<Budget>("/v1/budgets", data),
    update: (id: number, data: BudgetInput) => api.put<Budget>(`/v1/budgets/${id}`, data),
    delete: (id: number) => api.delete(`/v1/budgets/${id}`),
};

export const SubscriptionsAPI = {
    list: (status: "all" | Subscription["status"] = "all") => api.get<Subscription[]>("/v1/subscriptions", { params: { status } }),
    create: (data: SubscriptionInput) => api.post<Subscription>("/v1/subscriptions", data),
    update: (id: number, data: SubscriptionInput) => api.put<Subscription>(`/v1/subscriptions/${id}`, data),
    delete: (id: number) => api.delete(`/v1/subscriptions/${id}`),
    markPaid: (id: number, paidDate?: string) => api.post<Subscription>(`/v1/subscriptions/${id}/mark-paid`, { paid_date: paidDate }),
    createReminders: () => api.post<{ created: number }>("/v1/subscriptions/reminders"),
};


export const SplitAPI = {
    previewInvite: (token: string) => api.get<SplitInvitePreview>(`/v1/split/invites/${encodeURIComponent(token)}/preview`),
    acceptInvite: (token: string) => api.post(`/v1/split/invites/${encodeURIComponent(token)}/accept`),
    listFriends: (status: "active" | "all" = "active") => api.get<SplitFriend[]>("/v1/split/friends", { params: { status } }),
    createFriend: (data: SplitFriendInput) => api.post<SplitFriend>("/v1/split/friends", data),
    updateFriend: (id: number, data: SplitFriendInput) => api.put<SplitFriend>(`/v1/split/friends/${id}`, data),
    archiveFriend: (id: number) => api.delete(`/v1/split/friends/${id}`),
    listGroups: (status: "active" | "all" = "active") => api.get<SplitGroup[]>("/v1/split/groups", { params: { status } }),
    createGroup: (data: SplitGroupInput) => api.post<SplitGroup>("/v1/split/groups", data),
    updateGroup: (id: number, data: SplitGroupInput) => api.put<SplitGroup>(`/v1/split/groups/${id}`, data),
    archiveGroup: (id: number) => api.delete(`/v1/split/groups/${id}`),
    listBills: () => api.get<SplitBill[]>("/v1/split/bills"),
    getBillForEntry: (entryID: number) => api.get<SplitBill | null>(`/v1/split/bills/by-entry/${entryID}`),
    createBill: (data: SplitBillInput) => api.post<SplitBill>("/v1/split/bills", data),
    updateBill: (id: number, data: SplitBillInput) => api.put<SplitBill>(`/v1/split/bills/${id}`, data),
    deleteBill: (id: number) => api.delete(`/v1/split/bills/${id}`),
    listSettlements: () => api.get<SplitSettlement[]>("/v1/split/settlements"),
    createSettlement: (data: SplitSettlementInput) => api.post<SplitSettlement>("/v1/split/settlements", data),
    activity: (page = 1, pageSize = 20) => api.get<SplitActivityResponse>("/v1/split/activity", { params: { page, page_size: pageSize } }),
    balances: () => api.get<SplitBalance[]>("/v1/split/balances"),
};

export const UserAPI = {
    updateProfile: (data: { username: string }) => api.put<{ user: User }>("/v1/user", data),
};

export const NotificationsAPI = {
    list: (status: "all" | "unread" | "read" = "all") => api.get<NotificationListResponse>("/v1/notifications", { params: { status } }),
    unreadCount: () => api.get<{ unread_count: number }>("/v1/notifications/unread-count"),
    markRead: (id: number) => api.patch<AppNotification>(`/v1/notifications/${id}/read`),
    markAllRead: () => api.patch<{ updated: number }>("/v1/notifications/read-all"),
    delete: (id: number) => api.delete(`/v1/notifications/${id}`),
};
