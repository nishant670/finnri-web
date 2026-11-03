"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    X,
    Info,
    Plus,
    Check,
    Brain,
    Search,
    Sparkles,
    Tag,
    Calendar,
    Wallet,
    ArrowRight,
    Loader2,
    StickyNote,
    Users,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Account, AccountsAPI, apiErrorMessage, asEntitlementError, EntitlementError, EntriesAPI, EntrySplitInput, SplitAPI, SplitBill, SplitFriend, SplitGroup, Transaction, TransactionInput } from "@/app/lib/api";
import { PAYMENT_MODES, PaymentMode, paymentModeForAccountType, resolvePaymentMode } from "@/app/lib/accounts";
import { categoryOptionsFor, loadCategories } from "@/app/lib/categories";
import { formatMoney, toApiTime, toLocalISO } from "@/app/lib/format";
import InlineSplitEditor from "@/app/components/dashboard/InlineSplitEditor";
import AddDetailChips, { type AddDetailOption } from "@/app/components/ui/AddDetailChips";
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

type EntryDetail = "notes" | "tags" | "split";

const ENTRY_DETAILS: AddDetailOption<EntryDetail>[] = [
    { key: "notes", label: "Note", icon: StickyNote },
    { key: "tags", label: "Tags", icon: Tag },
    { key: "split", label: "Split with friends", icon: Users },
];

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
    // Optional details asked for with a chip since the dialog opened. One that
    // already holds something shows without being asked for.
    const [revealedDetails, setRevealedDetails] = useState<EntryDetail[]>([]);
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
        setRevealedDetails([]);

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
        setRevealedDetails([]);
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
        fieldReviewState(field) === "review" && "border-warning bg-warning-surface ring-2 ring-warning/25",
        fieldReviewState(field) === "filled" && "border-accent/50 bg-selected/60"
    );

    const FieldStatus = ({ field }: { field: DraftField }) => {
        const status = fieldReviewState(field);
        if (status === "manual") return null;
        if (status === "review") return <button type="button" onClick={(event) => { event.preventDefault(); markFieldReviewed(field); }} title={`Confirm the AI's ${DRAFT_FIELD_LABELS[field]} value`} className="ml-2 rounded-full bg-warning-surface px-2 py-0.5 text-[11px] font-bold text-warning ring-1 ring-warning/40 hover:brightness-95">Check · tap to confirm</button>;
        return <span className="ml-2 rounded-full bg-selected px-2 py-0.5 text-[11px] font-bold">AI filled</span>;
    };

    const canSplit = type === "expense" && (!isEditing || splitDataAvailable);
    const isDetailShown = (detail: EntryDetail) => {
        if (revealedDetails.includes(detail)) return true;
        if (detail === "notes") return notes.trim().length > 0;
        if (detail === "tags") return tags.length > 0;
        return Boolean(entrySplit);
    };
    const availableDetails = ENTRY_DETAILS.filter((option) => !isDetailShown(option.key) && (option.key !== "split" || canSplit));
    const addDetail = (detail: EntryDetail) => {
        setRevealedDetails((current) => (current.includes(detail) ? current : [...current, detail]));
        // The chip turns the split on in the same click that shows it; a card
        // whose checkbox then had to be found would be two clicks for one wish.
        if (detail === "split" && !entrySplit) {
            setEntrySplit({ participants: [{ friend_id: undefined, share_amount: 0, direction: "friend_owes_user" }] });
        }
        if (detail === "tags") setShowTagInput(true);
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
            setError(`Check the ${pendingReviewFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")} first.`);
            return;
        }
        if (!amount || !(parseFloat(amount) > 0)) {
            setError("Enter an amount above zero.");
            return;
        }
        if (!accountID) {
            setError(type === "income" ? "Choose the account it was received in." : "Choose the account it was paid from.");
            return;
        }
        if (!category) {
            setError(categoriesError || "Pick a category.");
            return;
        }
        if (requiresExplicitPaymentMode && !explicitPaymentMode) {
            setError("Choose how this account paid.");
            return;
        }
        const numericAmount = parseFloat(amount);
        // A blank title saves as the category, the same fallback the app uses,
        // so "what was it for?" is honestly optional rather than a required
        // field dressed as a question.
        const typedTitle = title.trim();
        const savedTitle = typedTitle || category;
        if (entrySplit) {
            const invalidParticipant = entrySplit.participants.some((participant) => !participant.friend_id || participant.share_amount <= 0);
            const totalShares = entrySplit.participants.reduce((sum, participant) => sum + Number(participant.share_amount || 0), 0);
            if (invalidParticipant) { setError("Everyone in the split needs a friend and an amount."); return; }
            if (totalShares > numericAmount) { setError("The shares add up to more than the total."); return; }
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
                title: transaction?.merchant ? transaction.title : savedTitle,
                merchant: transaction ? (transaction.merchant ? typedTitle : transaction.merchant) : typedTitle,
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
            toast({ title: transaction ? `${savedTitle} updated` : `${savedTitle} ${formatMoney(numericAmount)} saved` });
            setTimeout(() => {
                onClose();
                resetForm();
            }, 1000);
        } catch (requestError) {
            const entitlement = asEntitlementError(requestError);
            if (entitlement) setAccessError(entitlement);
            else setError(apiErrorMessage(requestError, transaction ? "We couldn’t update this transaction. Check your connection and try again." : "We couldn’t save this transaction. Check your connection and try again."));
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

    const label = "flex items-center text-sm font-semibold text-muted";
    const input = "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:opacity-60";
    const iconInput = cn(input, "pl-10");
    const fieldIcon = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted";

    return (
        <Dialog open={isOpen} onClose={onClose} labelledBy="transaction-dialog-title" panelClassName="sm:max-w-2xl">
            <div className="flex min-h-full flex-col">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4 sm:px-7">
                    <div>
                        <h3 id="transaction-dialog-title" className="text-xl font-bold">{isEditing ? "Edit transaction" : "Add a transaction"}</h3>
                        <p className="mt-0.5 text-sm text-muted">{isEditing ? "Changes show everywhere this transaction appears." : "Only the amount and account are needed."}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-track hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>

                {!isEditing && (
                    <div className="px-5 pt-5 sm:px-7">
                        <div role="tablist" aria-label="How to add it" className="grid grid-cols-2 gap-1 rounded-full bg-track p-1">
                            {([["quick", "Describe it", Sparkles], ["manual", "Fill it in", Plus]] as const).map(([value, text, Icon]) => (
                                <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={cn("flex h-10 items-center justify-center gap-2 rounded-full text-sm transition", mode === value ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted hover:text-foreground")}>
                                    <Icon className="h-4 w-4" /> {text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 px-5 py-5 sm:px-7">
                    {mode === "quick" ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-selected px-2.5 py-0.5 text-[12px] font-bold"><Sparkles className="h-3.5 w-3.5 text-accent" /> Finnri AI</span>
                                <textarea
                                    value={text}
                                    onChange={(e) => updateSourceText(e.target.value)}
                                    aria-label="Describe the transaction"
                                    placeholder="Say it the way you’d text it: “Lunch 250 on UPI”, or paste a bank SMS"
                                    className="h-40 w-full resize-none rounded-2xl border border-border bg-background px-4 pb-4 pt-12 text-lg outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
                                />
                            </div>
                            <button type="button" onClick={handleExtract} disabled={extracting || !text} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-bold text-on-accent transition hover:brightness-105 disabled:opacity-50">
                                {extracting ? <><Loader2 className="h-5 w-5 animate-spin" /> Reading…</> : <><Brain className="h-5 w-5" /> Fill it in for me</>}
                            </button>
                            <p className="flex items-center gap-2 text-[13px] text-muted"><Info className="h-4 w-4 shrink-0" /> You’ll see every field before anything is saved.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {!isEditing && text.trim() && (
                                <section className={cn("rounded-2xl p-4", parsedDraft ? "bg-warning-surface" : "bg-track")}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className={cn("text-[13px] font-bold", parsedDraft ? "text-warning" : "text-muted")}>{parsedDraft ? "AI draft · check before saving" : "Your original text"}</p>
                                            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6">{text}</p>
                                        </div>
                                        <button type="button" onClick={() => setMode("quick")} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-bold hover:bg-track">Edit text</button>
                                    </div>
                                    {parsedDraft && pendingReviewFields.length > 0 && <p className="mt-2 text-[13px] font-semibold text-warning">Check the {pendingReviewFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")}, then you can save.</p>}
                                    {parseFailed && <p className="mt-2 text-[13px] text-muted">Fill in the form yourself, or edit the text and try again.</p>}
                                    {clarifications.map((clarification) => <p key={clarification} className="mt-2 flex items-start gap-2 text-sm text-warning"><Info className="mt-0.5 h-4 w-4 shrink-0" />{clarification}</p>)}
                                </section>
                            )}
                            {parsedDraft && missingFields.length > 0 && <p className="rounded-2xl bg-warning-surface p-4 text-sm text-warning"><span className="font-bold">Still needed: </span>{missingFields.map((field) => DRAFT_FIELD_LABELS[field]).join(", ")}.</p>}

                            {/* The number comes first and widest. It is the one thing every
                                entry needs, and the type beside it is a single tap. */}
                            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                                <div>
                                    <label htmlFor="entry-amount" className={label}>Amount<FieldStatus field="amount" /></label>
                                    <div className="relative mt-1">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">₹</span>
                                        <input
                                            id="entry-amount"
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={amount}
                                            autoFocus={!isEditing}
                                            onChange={(e) => { setAmount(e.target.value); markFieldChanged("amount"); }}
                                            className={fieldClass("amount", cn(input, "font-display h-16 pl-10 text-[32px] font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <span className={label}>Type<FieldStatus field="type" /></span>
                                    <div role="radiogroup" aria-label="Transaction type" className={fieldClass("type", "mt-1 grid h-16 grid-cols-2 gap-1 rounded-xl border border-border bg-track p-1.5")}>
                                        <button type="button" role="radio" aria-checked={type === "expense"} onClick={() => { setType("expense"); setCategory(expenseDefault); markFieldChanged("type"); }} className={cn("rounded-lg px-5 text-sm transition", type === "expense" ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted")}>Spent</button>
                                        <button type="button" role="radio" aria-checked={type === "income"} onClick={() => { setType("income"); setCategory(incomeDefault); setEntrySplit(null); markFieldChanged("type"); }} className={cn("rounded-lg px-5 text-sm transition", type === "income" ? "bg-card font-bold text-positive shadow-sm dark:bg-border" : "font-medium text-muted")}>Received</button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="entry-title" className={label}>What was it for?<span className="ml-1.5 font-normal">optional</span><FieldStatus field="title" /></label>
                                    <div className="relative mt-1">
                                        <Search className={fieldIcon} />
                                        <input id="entry-title" type="text" placeholder={category ? `Saved as “${category}” if blank` : "e.g. Lunch at Third Wave"} value={title} onChange={(e) => { setTitle(e.target.value); markFieldChanged("title"); }} className={fieldClass("title", iconInput)} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="entry-category" className={label}>Category<FieldStatus field="category" /></label>
                                    <select id="entry-category" value={category} onChange={(e) => { setCategory(e.target.value); markFieldChanged("category"); }} disabled={categoryOptions.length === 0} className={fieldClass("category", cn(input, "mt-1"))}>
                                        {categoryOptions.length === 0 && <option value="">{categoriesError ? "Categories unavailable" : "Loading categories…"}</option>}
                                        {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                    {categoriesError && <p className="mt-1 text-[13px] font-semibold text-negative">{categoriesError}</p>}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="entry-date" className={label}>Date & time<FieldStatus field="date" /></label>
                                    <div className="relative mt-1">
                                        <Calendar className={fieldIcon} />
                                        <input id="entry-date" type="datetime-local" value={date} onChange={(e) => { setDate(e.target.value); markFieldChanged("date"); }} className={fieldClass("date", iconInput)} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="entry-account" className={label}>{type === "income" ? "Received in" : "Paid from"}<FieldStatus field="account" /></label>
                                    <div className="relative mt-1">
                                        <Wallet className={fieldIcon} />
                                        <select id="entry-account" value={accountID} onChange={(e) => { setAccountID(Number(e.target.value)); markFieldChanged("account"); }} className={fieldClass("account", iconInput)}>
                                            <option value="" disabled>Choose an account</option>
                                            {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_default ? " (default)" : ""}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {requiresExplicitPaymentMode && (
                                <div>
                                    <label htmlFor="entry-payment-mode" className={label}>Payment mode</label>
                                    <select id="entry-payment-mode" value={explicitPaymentMode} onChange={(event) => { setExplicitPaymentMode(event.target.value as PaymentMode); markFieldChanged("account"); }} className={fieldClass("account", cn(input, "mt-1"))}>
                                        <option value="" disabled>Choose how this account paid</option>
                                        {PAYMENT_MODES.map((paymentMode) => <option key={paymentMode} value={paymentMode}>{paymentMode}</option>)}
                                    </select>
                                    <p className="mt-1 text-[13px] text-muted">“Other” accounts don’t imply how you paid, so Finnri stores exactly what you choose.</p>
                                </div>
                            )}

                            {/* Optional details. Each is a field once it has been asked for
                                or already holds something; the rest wait as chips below. */}
                            {isDetailShown("notes") && (
                                <div className="disclosure-enter">
                                    <label htmlFor="entry-notes" className={label}>Note<FieldStatus field="notes" /></label>
                                    <textarea id="entry-notes" autoFocus={revealedDetails.includes("notes") && !notes} value={notes} onChange={(event) => { setNotes(event.target.value); markFieldChanged("notes"); }} rows={3} placeholder="Context you’ll want later" className={fieldClass("notes", cn(input, "mt-1 h-auto resize-none py-3"))} />
                                </div>
                            )}
                            {isDetailShown("tags") && (
                                <div className="disclosure-enter">
                                    <span className={label}>Tags<FieldStatus field="tags" /></span>
                                    <div className="mt-1.5 flex flex-wrap gap-2">
                                        {tags.map((tag, i) => (
                                            <button type="button" aria-label={`Remove tag ${tag}`} key={i} onClick={() => { setTags(tags.filter(t => t !== tag)); markFieldChanged("tags"); }} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-selected px-3 text-[13px] font-bold transition-colors hover:bg-negative/10 hover:text-negative">
                                                <Tag className="h-3.5 w-3.5" /> {tag} <X className="h-3.5 w-3.5" />
                                            </button>
                                        ))}
                                        {showTagInput ? (
                                            <input autoFocus type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onBlur={handleAddTag} onKeyDown={(e) => e.key === "Enter" && handleAddTag()} placeholder="New tag" aria-label="New tag" className="h-9 w-32 rounded-full border border-accent bg-background px-3 text-[13px] outline-none" />
                                        ) : (
                                            <button type="button" onClick={() => setShowTagInput(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-[13px] font-semibold hover:border-accent hover:bg-selected"><Plus className="h-3.5 w-3.5 text-accent" /> Add tag</button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {canSplit && isDetailShown("split") && <div className="disclosure-enter"><InlineSplitEditor amount={Number(amount || 0)} friends={splitFriends} groups={splitGroups} value={entrySplit} onChange={setEntrySplit} /></div>}
                            {isEditing && !splitDataAvailable && <p className="rounded-2xl bg-warning-surface p-4 text-[13px] leading-5 text-warning">The linked split couldn’t be loaded, so saving leaves it unchanged. Edit it from Splits in the Finnri app.</p>}
                            <AddDetailChips options={availableDetails} onAdd={addDetail} />
                        </div>
                    )}
                </div>

                {(accessError || error) && (
                    <div className="space-y-3 px-5 pb-4 sm:px-7">
                        {accessError && <Paywall error={accessError} featureLabel={accessFeatureLabel} compact />}
                        {error && <p role="alert" className="rounded-xl bg-negative/10 p-3 text-sm font-semibold text-negative">{error}</p>}
                    </div>
                )}

                <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                    <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-sm font-bold hover:bg-track">Cancel</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || mode === "quick" || !accountID || pendingReviewFields.length > 0}
                        className={cn("group inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition disabled:opacity-50", success ? "bg-positive text-background" : "bg-accent text-on-accent hover:brightness-105")}
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? <><Check className="h-5 w-5" /> {isEditing ? "Updated" : "Saved"}</> : <>{isEditing ? "Save changes" : "Save transaction"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
