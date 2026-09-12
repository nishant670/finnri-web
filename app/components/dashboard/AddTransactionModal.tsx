"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    X,
    Info,
    Plus,
    Check,
    Brain,
    Search,
    Zap,
    Tag,
    Calendar,
    Wallet,
    ArrowRight,
    Loader2
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Account, AccountsAPI, apiErrorMessage, asEntitlementError, EntitlementError, EntriesAPI, EntrySplitInput, SplitAPI, SplitBill, SplitFriend, SplitGroup, Transaction, TransactionInput } from "@/app/lib/api";
import { PAYMENT_MODES, PaymentMode, paymentModeForAccountType, resolvePaymentMode } from "@/app/lib/accounts";
import { categoryOptionsFor, loadCategories } from "@/app/lib/categories";
import { formatMoney, toApiTime, toLocalISO } from "@/app/lib/format";
import InlineSplitEditor from "@/app/components/dashboard/InlineSplitEditor";
import Paywall from "@/app/components/Paywall";
import Dialog from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/Toast";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/app/lib/analytics";

type DraftField = "type" | "amount" | "title" | "category" | "date" | "account" | "tags" | "notes";

const DRAFT_FIELD_LABELS: Record<DraftField, string> = {
    type: "type",
    amount: "amount",
    title: "merchant or title",
    category: "category",
    date: "date and time",
    account: "account",
    tags: "tags",
    notes: "notes",
};

function draftFieldFor(rawField: string): DraftField | null {
    const field = rawField.trim().toLowerCase();
    if (field === "type") return "type";
    if (field === "amount" || field === "currency") return "amount";
    if (field === "title" || field === "merchant") return "title";
    if (field === "category") return "category";
    if (field === "date" || field === "time") return "date";
    if (["account", "accountid", "account_id", "account_hint", "mode", "payment_mode"].includes(field)) return "account";
    if (field === "tag" || field === "tags") return "tags";
    if (field === "note" || field === "notes") return "notes";
    return null;
}

function uniqueDraftFields(rawFields: string[]) {
    return Array.from(new Set(rawFields.map(draftFieldFor).filter((field): field is DraftField => Boolean(field))));
}

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction | null;
    linkedSplitBill?: SplitBill | null;
    splitDataAvailable?: boolean;
    onSaved?: (transaction: Transaction) => void | Promise<void>;
}

function entrySplitFromBill(bill: SplitBill | null | undefined): EntrySplitInput | null {
    if (!bill) return null;
    return {
        group_id: bill.group_id || undefined,
        notes: bill.notes,
        participants: bill.participants.map((participant) => ({
            friend_id: participant.friend_id,
            share_amount: participant.share_amount,
            direction: participant.direction,
        })),
    };
}

export default function AddTransactionModal({ isOpen, onClose, transaction = null, linkedSplitBill = null, splitDataAvailable = true, onSaved }: AddTransactionModalProps) {
    const { toast } = useToast();
    const isEditing = Boolean(transaction);
    const [mode, setMode] = useState<"quick" | "manual">("quick");
    const [extracting, setExtracting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [text, setText] = useState("");
    const [success, setSuccess] = useState(false);
    const [parsedDraft, setParsedDraft] = useState(false);
    const [parseFailed, setParseFailed] = useState(false);
    const [aiFilledFields, setAiFilledFields] = useState<DraftField[]>([]);
    const [pendingReviewFields, setPendingReviewFields] = useState<DraftField[]>([]);
    const [missingFields, setMissingFields] = useState<DraftField[]>([]);
    const [clarifications, setClarifications] = useState<string[]>([]);

    // Form State
    const [type, setType] = useState<"expense" | "income">("expense");
    const [amount, setAmount] = useState("");
    const [title, setTitle] = useState("");
    // Empty until GET /v1/categories answers. There is deliberately no local
    // list to fall back on — see app/lib/categories.ts.
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
    const [expenseDefault, setExpenseDefault] = useState("");
    const [incomeDefault, setIncomeDefault] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [date, setDate] = useState(() => toLocalISO(new Date(), "minute"));
    const [accountID, setAccountID] = useState<number | "">("");
    const [explicitPaymentMode, setExplicitPaymentMode] = useState<PaymentMode | "">("");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [splitFriends, setSplitFriends] = useState<SplitFriend[]>([]);
    const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([]);
    const [entrySplit, setEntrySplit] = useState<EntrySplitInput | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [newTag, setNewTag] = useState("");
    const [showTagInput, setShowTagInput] = useState(false);
    const [error, setError] = useState("");
    const [accessError, setAccessError] = useState<EntitlementError | null>(null);
    const [accessFeatureLabel, setAccessFeatureLabel] = useState("This feature");

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        Promise.allSettled([AccountsAPI.list(), SplitAPI.listFriends(), SplitAPI.listGroups(), loadCategories()]).then(([accountsResult, friendsResult, groupsResult, categoriesResult]) => {
            if (!active) return;
            if (accountsResult.status === "fulfilled") {
                setAccounts(accountsResult.value.data);
                const preferred = accountsResult.value.data.find((item) => item.is_default) || accountsResult.value.data[0];
                setAccountID((current) => current || preferred?.id || "");
            } else setError(apiErrorMessage(accountsResult.reason, "We couldn’t load your accounts."));
            if (friendsResult.status === "fulfilled") setSplitFriends(friendsResult.value.data);
            if (groupsResult.status === "fulfilled") setSplitGroups(groupsResult.value.data);
            if (categoriesResult.status === "fulfilled") {
                setCategories(categoriesResult.value.categories);
                setIncomeCategories(categoriesResult.value.income_categories);
                setExpenseDefault(categoriesResult.value.default);
                setIncomeDefault(categoriesResult.value.income_default);
                setCategoriesError("");
                // The server's own fallback, not a guess. Anything the user does
                // not classify lands in the bucket that means "unclassified"
                // rather than being misfiled into a real category.
                setCategory((current) => current || categoriesResult.value.default);
            } else {
                setCategories([]);
                setCategoriesError(apiErrorMessage(categoriesResult.reason, "We couldn’t load the category list."));
            }
        });
        return () => { active = false; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setSuccess(false);
        setError("");
        setAccessError(null);
        setParsedDraft(false);
        setParseFailed(false);
        setAiFilledFields([]);
        setPendingReviewFields([]);
        setMissingFields([]);
        setClarifications([]);
        setShowTagInput(false);
        setNewTag("");

        if (transaction) {
            setMode("manual");
            setText(transaction.source_text || "");
            setType(transaction.type);
            setAmount(String(transaction.amount));
            setTitle(transaction.merchant || transaction.title);
            setCategory(transaction.category);
            setDate(`${transaction.date}T${toApiTime(transaction.time) || "00:00"}`);
            setAccountID(transaction.account_id);
            setExplicitPaymentMode(transaction.mode);
            setTags(transaction.tags || []);
            setNotes(transaction.notes || "");
            setEntrySplit(splitDataAvailable ? entrySplitFromBill(linkedSplitBill) : null);
            return;
        }

        setMode("quick");
        setText("");
        setType("expense");
        setAmount("");
        setTitle("");
        setCategory("");
        setDate(toLocalISO(new Date(), "minute"));
        setAccountID("");
        setExplicitPaymentMode("");
        setTags([]);
        setNotes("");
        setEntrySplit(null);
    }, [isOpen, linkedSplitBill, splitDataAvailable, transaction]);

    // Keeps a value the canonical list does not contain selectable — a category
    // the user created deliberately, which the backend stores verbatim. Without
    // this, opening such an entry would silently rewrite it.
    const categoryOptions = useMemo(
        () => categoryOptionsFor(type === "income" ? incomeCategories : categories, category),
        [categories, category, incomeCategories, type]
    );
    const selectedAccount = useMemo(() => accounts.find((item) => item.id === accountID), [accountID, accounts]);
    const requiresExplicitPaymentMode = selectedAccount?.type === "other" && paymentModeForAccountType(selectedAccount.type) === null;

    const resetForm = () => {
        setText("");
        setType("expense");
        setAmount("");
        setTitle("");
        setCategory("");
        setDate(toLocalISO(new Date(), "minute"));
        setAccountID("");
        setExplicitPaymentMode("");
        setTags([]);
        setNotes("");
        setEntrySplit(null);
        setMode("quick");
        setSuccess(false);
        setError("");
        setAccessError(null);
        setAccessFeatureLabel("This feature");
        setParsedDraft(false);
        setParseFailed(false);
        setAiFilledFields([]);
        setPendingReviewFields([]);
        setMissingFields([]);
        setClarifications([]);
    };

    const updateSourceText = (value: string) => {
        setText(value);
        setParsedDraft(false);
        setParseFailed(false);
        setAiFilledFields([]);
        setPendingReviewFields([]);
        setMissingFields([]);
        setClarifications([]);
    };

    const markFieldReviewed = (field: DraftField) => {
        setPendingReviewFields((current) => current.filter((item) => item !== field));
        setMissingFields((current) => current.filter((item) => item !== field));
    };

    const markFieldChanged = (field: DraftField) => {
        markFieldReviewed(field);
        setAiFilledFields((current) => current.filter((item) => item !== field));
    };

    const fieldReviewState = (field: DraftField) => {
        if (pendingReviewFields.includes(field)) return "review";
        if (parsedDraft && aiFilledFields.includes(field)) return "filled";
        return "manual";
    };

    const fieldClass = (field: DraftField, base: string) => cn(
        base,
        fieldReviewState(field) === "review" && "ring-2 ring-amber-400/70 bg-amber-50 dark:bg-amber-950/20",
        fieldReviewState(field) === "filled" && "ring-1 ring-accent/40 bg-accent/5"
    );

    const FieldStatus = ({ field }: { field: DraftField }) => {
        const status = fieldReviewState(field);
        if (status === "manual") return null;
        if (status === "review") return <button type="button" onClick={(event) => { event.preventDefault(); markFieldReviewed(field); }} title={`Confirm the AI's ${DRAFT_FIELD_LABELS[field]} value`} className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] tracking-normal text-amber-700 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300">Check this · confirm</button>;
        return <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] tracking-normal text-accent">AI filled</span>;
    };

    const handleExtract = async () => {
        if (!text.trim()) return;
        setExtracting(true);
        setError("");
        setAccessError(null);
        setAccessFeatureLabel("AI transaction extraction");
        setParseFailed(false);
        try {
            const formData = new FormData();
            formData.append("hint_text", text);
            // formData.append("timezone", ...); // Backend handles timezone usually?

            const res = await EntriesAPI.parse(formData);
            const data = res.data; // Should return a partial Transaction/Entry

            // Map response to form
            if (data) {
                const filled: string[] = [];
                if (data.type) filled.push("type");
                if (data.amount !== undefined) filled.push("amount");
                if (data.title || data.merchant) filled.push("title");
                if (data.category) filled.push("category");
                if (data.date || data.time) filled.push("date");
                if (data.account_hint || data.mode) filled.push("account");
                if (data.tags?.length) filled.push("tags");
                if (data.note) filled.push("notes");
                const explicitlyFlagged = Object.entries(data.needs_confirmation || {}).filter(([, needsReview]) => needsReview).map(([field]) => field);
                const lowConfidence = Object.entries(data.confidence || {}).filter(([, confidence]) => confidence < 0.7).map(([field]) => field);
                const missing = uniqueDraftFields(data.missing_fields || []);
                setAiFilledFields(uniqueDraftFields(filled));
                setMissingFields(missing);
                setPendingReviewFields(uniqueDraftFields([...explicitlyFlagged, ...lowConfidence, ...(data.missing_fields || [])]));
                setClarifications(data.clarifications || []);
                setParsedDraft(true);
                if (data.type) setType(data.type as "expense" | "income");
                if (data.amount !== undefined) setAmount(data.amount.toString());
                if (data.title || data.merchant) setTitle(data.merchant || data.title || "");
                if (data.category) setCategory(data.category);
                if (data.date) setDate(data.date + (data.time ? "T" + data.time : "T12:00")); // Rough iso conversion
                const parsedMode = resolvePaymentMode(data.mode);
                if (parsedMode) setExplicitPaymentMode(parsedMode);
                if (data.account_hint || data.mode) {
                    const hint = (data.account_hint || data.mode || "").toLowerCase();
                    const match = accounts.find((item) => item.name.toLowerCase().includes(hint) || item.type.replace("_", " ").includes(hint));
                    if (match) setAccountID(match.id);
                }
                if (data.tags) setTags(data.tags);
                if (data.note) setNotes(data.note);
                setText(data.source_text || text);
            }
            setMode("manual");
        } catch (requestError) {
            const entitlement = asEntitlementError(requestError);
            if (entitlement) setAccessError(entitlement);
            else setError(apiErrorMessage(requestError, "AI extraction is unavailable. You can still enter the transaction manually."));
            setParseFailed(true);
            setParsedDraft(false);
            setMode("manual");
        } finally {
            setExtracting(false);
        }
    };

    const handleSave = async () => {
        if (pendingReviewFields.length > 0) {
            setError(`Review ${pendingReviewFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")} before saving.`);
            return;
        }
        if (!amount || !title || !accountID) {
            setError("Amount, merchant, and account are required.");
            return;
        }
        if (!category) {
            setError(categoriesError || "Pick a category before saving.");
            return;
        }
        if (requiresExplicitPaymentMode && !explicitPaymentMode) {
            setError("Choose a payment mode for this account before saving.");
            return;
        }
        const numericAmount = parseFloat(amount);
        if (entrySplit) {
            const invalidParticipant = entrySplit.participants.some((participant) => !participant.friend_id || participant.share_amount <= 0);
            const totalShares = entrySplit.participants.reduce((sum, participant) => sum + Number(participant.share_amount || 0), 0);
            if (invalidParticipant) { setError("Choose a friend and positive share for every split participant."); return; }
            if (totalShares > numericAmount) { setError("Friend shares cannot exceed the transaction amount."); return; }
        }
        setSaving(true);
        setError("");
        setAccessError(null);
        setAccessFeatureLabel(entrySplit ? "Split expenses" : "Transaction capture");
        try {
            const payload: TransactionInput = {
                type,
                amount: numericAmount,
                currency: "INR",
                source: transaction?.source || (parsedDraft ? "text" : "manual"),
                // The form edits whichever name the drawer displays. Preserve a
                // distinct stored title when the transaction already has a
                // merchant; otherwise this field is the title itself.
                title: transaction?.merchant ? transaction.title : title,
                merchant: transaction ? (transaction.merchant ? title : transaction.merchant) : title,
                category,
                date: date.split("T")[0],
                time: date.split("T")[1] || "00:00:00",
                // Recognised account types deliberately omit mode. The API
                // derives the canonical value from this owned account_id.
                mode: requiresExplicitPaymentMode ? explicitPaymentMode || undefined : undefined,
                account_id: accountID,
                tags,
                notes: notes.trim(),
                source_text: transaction?.source_text || (parsedDraft ? text.trim() : undefined),
                ...(!isEditing || splitDataAvailable ? { split: type === "expense" ? entrySplit : null } : {}),
            };
            const response = transaction
                ? await EntriesAPI.update(transaction.id, payload)
                : await EntriesAPI.create(payload);
            if (!transaction) {
                // Plausible funnels use the first occurrence in the session;
                // sending every successful create keeps this correct across
                // every composer entry point without storing a user identifier.
                trackAnalyticsEvent(ANALYTICS_EVENTS.funnelCaptureCreated, {
                    source: parsedDraft ? "text" : "manual",
                });
            }
            await onSaved?.(response.data);
            setSuccess(true);
            toast({ title: transaction ? `${title} updated` : `${title} ${formatMoney(numericAmount)} saved` });
            setTimeout(() => {
                onClose();
                resetForm();
            }, 1000);
        } catch (requestError) {
            const entitlement = asEntitlementError(requestError);
            if (entitlement) setAccessError(entitlement);
            else setError(apiErrorMessage(requestError, transaction ? "We couldn’t update this transaction." : "We couldn’t save this transaction."));
        } finally {
            setSaving(false);
        }
    };

    // Add Tag
    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            markFieldChanged("tags");
            setNewTag("");
            setShowTagInput(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} labelledBy="transaction-dialog-title" panelClassName="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden sm:max-h-[90dvh]">
                    <div className="dialog-enter max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card sm:max-h-[90dvh]">
                        {/* Header */}
                        <div className="p-8 border-b border-border flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <h3 id="transaction-dialog-title" className="text-2xl font-bold font-rounded">{isEditing ? "Edit Transaction" : "Add Transaction"}</h3>
                                <p className="text-sm text-zinc-500 font-medium">{isEditing ? "Correct the confirmed record and keep every surface in sync." : "Capture your expenses & income instantly."}</p>
                            </div>
                            <button onClick={onClose} aria-label="Close transaction dialog" className="p-3 bg-white dark:bg-zinc-700 rounded-2xl hover:text-accent transition-colors shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Mode Switcher */}
                        {!isEditing && <div className="px-8 pt-8">
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                                <button
                                    onClick={() => setMode("quick")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                                        mode === "quick" ? "bg-white dark:bg-zinc-700 text-accent shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    <Brain className="w-4 h-4" /> Quick Add
                                </button>
                                <button
                                    onClick={() => setMode("manual")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                                        mode === "manual" ? "bg-white dark:bg-zinc-700 text-accent shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    <Plus className="w-4 h-4" /> Manual Entry
                                </button>
                            </div>
                        </div>}

                        <div className="min-h-[400px] p-8 pb-36">
                            {mode === "quick" ? (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="relative">
                                        <textarea
                                            value={text}
                                            onChange={(e) => updateSourceText(e.target.value)}
                                            placeholder="Paste transaction text here... e.g. 'Paid 250 lunch UPI'"
                                            className="w-full h-48 bg-zinc-50 dark:bg-zinc-800 border-none rounded-panel p-8 text-xl font-medium outline-none focus:ring-4 focus:ring-accent/10 transition-all resize-none placeholder:text-zinc-300"
                                        />
                                        <div className="absolute top-6 left-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full pointer-events-none">
                                            <Zap className="w-3 h-3" /> AI Engine Ready
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleExtract}
                                            disabled={extracting || !text}
                                            className={cn(
                                                "flex items-center justify-center gap-3 bg-accent text-zinc-950 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-accent/20 transition-all",
                                                (extracting || !text) ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                                            )}
                                        >
                                            {extracting ? (
                                                <div className="flex items-center gap-3">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Extracting...
                                                </div>
                                            ) : (
                                                <>
                                                    <Brain className="w-6 h-6" />
                                                    Extract with AI
                                                </>
                                            )}
                                        </button>
                                        <div className="flex items-center gap-4 px-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-zinc-400">
                                            <Info className="w-5 h-5 shrink-0" />
                                            <p className="text-xs font-medium leading-snug">Simply paste messages or type notes. Our AI will fill the form.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {!isEditing && text.trim() && (
                                        <section className={cn("rounded-2xl border p-4", parsedDraft ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-border bg-zinc-50 dark:bg-zinc-800")}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{parsedDraft ? "AI draft — review before saving" : "Your original text is still here"}</p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">{text}</p>
                                                </div>
                                                <button onClick={() => setMode("quick")} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-accent hover:bg-accent/10">Edit text</button>
                                            </div>
                                            {parsedDraft && pendingReviewFields.length > 0 && <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">Check {pendingReviewFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")} before save is enabled.</p>}
                                            {parseFailed && <p className="mt-3 text-xs text-zinc-500">The form remains manual; edit or copy the text above, or return to Quick Add and try again.</p>}
                                            {clarifications.map((clarification) => <p key={clarification} className="mt-2 flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200"><Info className="mt-0.5 h-4 w-4 shrink-0" />{clarification}</p>)}
                                        </section>
                                    )}
                                    {parsedDraft && missingFields.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200"><p className="font-bold">Still needed</p><p className="mt-1">Fill or confirm: {missingFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")}.</p></div>}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Type<FieldStatus field="type" /></label>
                                            <div className={fieldClass("type", "flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl")}>
                                                <button
                                                    onClick={() => { setType("expense"); setCategory(expenseDefault); markFieldChanged("type"); }}
                                                    className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", type === "expense" ? "bg-white dark:bg-zinc-700 text-accent shadow-sm" : "text-zinc-400")}
                                                >
                                                    Expense
                                                </button>
                                                <button
                                                    onClick={() => { setType("income"); setCategory(incomeDefault); setEntrySplit(null); markFieldChanged("type"); }}
                                                    className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", type === "income" ? "bg-white dark:bg-zinc-700 text-green-500 shadow-sm" : "text-zinc-400")}
                                                >
                                                    Income
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Amount<FieldStatus field="amount" /></label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">₹</span>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => { setAmount(e.target.value); markFieldChanged("amount"); }}
                                                    className={fieldClass("amount", "w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl pl-8 pr-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-accent/20")}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Merchant / Title<FieldStatus field="title" /></label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Starbucks"
                                                    value={title}
                                                    onChange={(e) => { setTitle(e.target.value); markFieldChanged("title"); }}
                                                    className={fieldClass("title", "w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20")}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category<FieldStatus field="category" /></label>
                                            <select
                                                value={category}
                                                onChange={(e) => { setCategory(e.target.value); markFieldChanged("category"); }}
                                                disabled={categoryOptions.length === 0}
                                                className={fieldClass("category", "w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60")}
                                            >
                                                {categoryOptions.length === 0 && <option value="">{categoriesError ? "Categories unavailable" : "Loading categories…"}</option>}
                                                {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                            </select>
                                            {categoriesError && <p className="text-[10px] font-bold text-red-500">{categoriesError}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date & Time<FieldStatus field="date" /></label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="datetime-local"
                                                    value={date}
                                                    onChange={(e) => { setDate(e.target.value); markFieldChanged("date"); }}
                                                    className={fieldClass("date", "w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20")}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Account<FieldStatus field="account" /></label>
                                            <div className="relative">
                                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <select
                                                    value={accountID}
                                                    onChange={(e) => { setAccountID(Number(e.target.value)); markFieldChanged("account"); }}
                                                    className={fieldClass("account", "w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20")}
                                                >
                                                    <option value="" disabled>Select an account</option>
                                                    {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (Default)" : ""}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {requiresExplicitPaymentMode && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Payment mode</label>
                                            <select
                                                value={explicitPaymentMode}
                                                onChange={(event) => { setExplicitPaymentMode(event.target.value as PaymentMode); markFieldChanged("account"); }}
                                                className={fieldClass("account", "w-full rounded-xl border-none bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 dark:bg-zinc-800")}
                                            >
                                                <option value="" disabled>Choose how this account paid</option>
                                                {PAYMENT_MODES.map((paymentMode) => <option key={paymentMode} value={paymentMode}>{paymentMode}</option>)}
                                            </select>
                                            <p className="text-xs text-zinc-400">“Other” accounts do not imply a payment rail, so Finnri will store exactly what you choose.</p>
                                        </div>
                                    )}

                                    {type === "expense" && (!isEditing || splitDataAvailable) && <InlineSplitEditor amount={Number(amount || 0)} friends={splitFriends} groups={splitGroups} value={entrySplit} onChange={setEntrySplit} />}
                                    {isEditing && !splitDataAvailable && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">The linked split could not be loaded, so this save will leave it unchanged. Open the split ledger to edit it separately.</p>}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tags<FieldStatus field="tags" /></label>
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag, i) => (
                                                <button type="button" aria-label={`Remove tag ${tag}`} key={i} onClick={() => { setTags(tags.filter(t => t !== tag)); markFieldChanged("tags"); }} className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-lg group cursor-pointer hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                                    <Tag className="w-3 h-3" /> {tag} <X className="w-2.5 h-2.5 ml-1" />
                                                </button>
                                            ))}
                                            {showTagInput ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={newTag}
                                                        onChange={(e) => setNewTag(e.target.value)}
                                                        onBlur={handleAddTag}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                                        placeholder="New tag..."
                                                        className="w-24 px-2 py-1 bg-white border border-accent rounded-lg text-xs outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowTagInput(true)} className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-lg border border-dashed border-zinc-300 hover:border-accent transition-colors">
                                                    <Plus className="w-3 h-3" /> Add tag
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Notes <span className="font-medium normal-case tracking-normal">optional</span><FieldStatus field="notes" /></label>
                                        <textarea value={notes} onChange={(event) => { setNotes(event.target.value); markFieldChanged("notes"); }} rows={3} placeholder="Add context you’ll want later" className={fieldClass("notes", "w-full resize-none rounded-xl border-none bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20 dark:bg-zinc-800")} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {accessError && <div className="mx-8 mb-4"><Paywall error={accessError} featureLabel={accessFeatureLabel} compact /></div>}
                        {error && <p className="mx-8 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}

                        {/* Footer */}
                        <div className="p-8 border-t border-border bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center sticky bottom-0 z-10">
                            <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors">Cancel</button>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || mode === "quick" || !accountID || pendingReviewFields.length > 0}
                                    className={cn(
                                        "group flex items-center justify-center gap-2 px-10 py-3 bg-accent text-zinc-950 rounded-xl font-bold text-sm shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-70",
                                        success && "bg-green-500 shadow-green-500/20"
                                    )}
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : success ? (
                                        <>
                                            <Check className="w-5 h-5" /> {isEditing ? "Updated!" : "Saved!"}
                                        </>
                                    ) : (
                                        <>
                                            {isEditing ? "Save Changes" : "Save Transaction"}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
        </Dialog>
    );
}
