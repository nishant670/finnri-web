"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Save, X } from "lucide-react";
import DataTable from "@/app/components/admin/DataTable";
import RoleGate from "@/app/components/admin/RoleGate";
import StatTile from "@/app/components/admin/StatTile";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import { AdminAPI, AdminAPIError } from "@/app/lib/admin-api";
import {
    CARD_ISSUERS,
    CARD_ORIENTATIONS,
    CARD_TONES,
    LANDSCAPE_DRAWINGS,
    PORTRAIT_DRAWINGS,
    emptyCardProductForm,
    issuerName,
    suggestProductId,
    toCardProductForm,
    toCardProductPayload,
    verificationAge,
    type CardCatalogue,
    type CardProduct,
    type CardProductForm,
} from "@/app/lib/card-catalogue";
import { formatDate } from "@/app/lib/format";

const inputClass = "mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground";
const labelClass = "text-[13px] font-semibold text-muted";
const rupees = (value: number | null) => (value === null ? "—" : `₹${value.toLocaleString("en-IN")}`);

/**
 * The card catalogue (plan §5): the real card products Add card offers, each
 * drawn in the app as a sketch. Fees are optional and need the issuer page
 * they came from; nothing is copied from a bank's site but facts and a link.
 */
export default function CardCataloguePage() {
    const { toast } = useToast();
    const [catalogue, setCatalogue] = useState<CardCatalogue | null>(null);
    const [error, setError] = useState("");
    const [issuer, setIssuer] = useState("");
    const [query, setQuery] = useState("");
    const [editing, setEditing] = useState<{ form: CardProductForm; isNew: boolean } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        AdminAPI.get<CardCatalogue>("card-products")
            .then(setCatalogue)
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load the card catalogue"));
    }, []);

    const products = useMemo(() => catalogue?.products ?? [], [catalogue]);
    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return products.filter(
            (product) =>
                (!issuer || product.issuer_id === issuer) &&
                (!needle || `${product.name} ${product.id} ${issuerName(product.issuer_id)}`.toLowerCase().includes(needle)),
        );
    }, [issuer, products, query]);
    const banks = useMemo(() => new Set(products.map((product) => product.issuer_id)), [products]);
    const withFees = products.filter((product) => product.annual_fee !== null).length;
    const reviewed = products.filter((product) => product.art_reviewed).length;
    const linkedCards = Object.values(catalogue?.cards_by_product ?? {}).reduce((sum, count) => sum + count, 0);

    function update<K extends keyof CardProductForm>(key: K, value: CardProductForm[K]) {
        setEditing((current) => {
            if (!current) return current;
            const form = { ...current.form, [key]: value };
            // A new product's id follows its bank and name until it is typed.
            if (current.isNew && (key === "name" || key === "issuer_id") && current.form.id === suggestProductId(current.form.issuer_id, current.form.name)) {
                form.id = suggestProductId(form.issuer_id, form.name);
            }
            return { ...current, form };
        });
    }

    async function save() {
        if (!editing) return;
        const { payload, errors } = toCardProductPayload(editing.form);
        setFieldErrors(errors);
        if (!payload) return;
        setSaving(true);
        try {
            const saved = editing.isNew
                ? await AdminAPI.post<CardProduct>("card-products", payload)
                : await AdminAPI.put<CardProduct>(`card-products/${encodeURIComponent(editing.form.id)}`, payload);
            setCatalogue((current) =>
                current
                    ? {
                          ...current,
                          products: editing.isNew
                              ? [...current.products, saved]
                              : current.products.map((product) => (product.id === saved.id ? saved : product)),
                      }
                    : current,
            );
            setEditing(null);
            toast({ title: editing.isNew ? "Card added" : "Card saved", description: `${issuerName(saved.issuer_id)} ${saved.name}` });
        } catch (reason) {
            const fields = reason instanceof AdminAPIError ? (reason.payload as { fields?: Record<string, string> } | undefined)?.fields : undefined;
            if (fields) setFieldErrors(fields);
            else setError(reason instanceof Error ? reason.message : "Unable to save this card");
        } finally {
            setSaving(false);
        }
    }

    if (!catalogue && !error) return <PageSkeleton />;

    const drawings = editing?.form.orientation === "portrait" ? PORTRAIT_DRAWINGS : LANDSCAPE_DRAWINGS;
    const fieldError = (key: string) => (fieldErrors[key] ? <span className="mt-1 block text-xs font-normal text-negative">{fieldErrors[key]}</span> : null);

    return (
        <div className="space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-[30px] font-bold leading-tight max-lg:sr-only sm:text-[34px]">Card catalogue</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        The real cards Add card offers, each drawn in the app as a sketch in the user&apos;s theme colours, with no logos. Fees
                        are optional and need the issuer page they came from.
                    </p>
                </div>
                <RoleGate minimum="support">
                    <button
                        onClick={() => {
                            setFieldErrors({});
                            setEditing({ form: emptyCardProductForm(issuer || "hdfc"), isNew: true });
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent"
                    >
                        <Plus className="h-4 w-4" /> Add a card
                    </button>
                </RoleGate>
            </header>
            {error && <div className="rounded-xl bg-negative/10 p-4 text-sm text-negative">{error}</div>}

            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatTile label="Cards" value={String(products.length)} hint={`${banks.size} banks`} />
                <StatTile label="With fees" value={String(withFees)} hint="from the issuer's terms" />
                <StatTile label="Art reviewed" value={`${reviewed} of ${products.length}`} hint="checked against the real card" />
                <StatTile label="Users' cards linked" value={String(linkedCards)} hint="accounts pointing at a product" />
            </section>

            {editing && (
                <section className="rounded-2xl border border-border bg-card p-6" aria-label={editing.isNew ? "New card" : `Edit ${editing.form.name}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-accent" />
                            <h2 className="text-[17px] font-bold">{editing.isNew ? "New card" : `${issuerName(editing.form.issuer_id)} ${editing.form.name}`}</h2>
                        </div>
                        <button onClick={() => setEditing(null)} className="grid h-10 w-10 place-items-center rounded-xl" aria-label="Close the editor">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className={labelClass}>
                            Bank
                            <select value={editing.form.issuer_id} onChange={(event) => update("issuer_id", event.target.value)} className={inputClass}>
                                {CARD_ISSUERS.map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            {fieldError("issuer_id")}
                        </label>
                        <label className={labelClass}>
                            Card name
                            <input value={editing.form.name} onChange={(event) => update("name", event.target.value)} placeholder="Millennia" className={inputClass} />
                            {fieldError("name")}
                        </label>
                        <label className={labelClass}>
                            Id {editing.isNew ? "" : "(fixed: cards point at it)"}
                            <input
                                value={editing.form.id}
                                readOnly={!editing.isNew}
                                onChange={(event) => update("id", event.target.value)}
                                placeholder="hdfc-millennia"
                                className={`${inputClass} font-mono ${editing.isNew ? "" : "opacity-70"}`}
                            />
                            {fieldError("id")}
                        </label>
                        <label className={labelClass}>
                            Tone
                            <select value={editing.form.tone} onChange={(event) => update("tone", event.target.value as CardProductForm["tone"])} className={inputClass}>
                                {CARD_TONES.map((tone) => (
                                    <option key={tone} value={tone}>
                                        {tone[0].toUpperCase() + tone.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={labelClass}>
                            Orientation
                            <select
                                value={editing.form.orientation}
                                onChange={(event) => update("orientation", event.target.value as CardProductForm["orientation"])}
                                className={inputClass}
                            >
                                {CARD_ORIENTATIONS.map((orientation) => (
                                    <option key={orientation} value={orientation}>
                                        {orientation[0].toUpperCase() + orientation.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className={labelClass}>
                            Drawing
                            <input value={editing.form.drawing} onChange={(event) => update("drawing", event.target.value)} list="card-drawings" className={`${inputClass} font-mono`} />
                            <datalist id="card-drawings">
                                {drawings.map((drawing) => (
                                    <option key={drawing} value={drawing} />
                                ))}
                            </datalist>
                            {fieldError("drawing")}
                        </label>
                        <label className={labelClass}>
                            The real card&apos;s idea
                            <input value={editing.form.art_idea} onChange={(event) => update("art_idea", event.target.value)} placeholder="Fine texture on blue" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Our drawing
                            <input
                                value={editing.form.art_drawn_as}
                                onChange={(event) => update("art_drawn_as", event.target.value)}
                                placeholder="a dot field with one sweep"
                                className={inputClass}
                            />
                        </label>
                        <label className={labelClass}>
                            Order in the bank&apos;s list
                            <input type="number" value={editing.form.sort_order} onChange={(event) => update("sort_order", event.target.value)} className={inputClass} />
                            {fieldError("sort_order")}
                        </label>
                        {(["joining_fee", "annual_fee", "fee_waiver_spend"] as const).map((key) => (
                            <label key={key} className={labelClass}>
                                {{ joining_fee: "Joining fee (₹)", annual_fee: "Annual fee (₹)", fee_waiver_spend: "Waived at yearly spend (₹)" }[key]}
                                <input inputMode="decimal" value={editing.form[key]} onChange={(event) => update(key, event.target.value)} placeholder="Unknown" className={inputClass} />
                                {fieldError(key)}
                            </label>
                        ))}
                        <label className={`${labelClass} md:col-span-2`}>
                            Sources: the issuer&apos;s card page or terms PDF, one per line
                            <textarea
                                value={editing.form.source_urls}
                                onChange={(event) => update("source_urls", event.target.value)}
                                rows={3}
                                className={`${inputClass} py-2 font-mono`}
                            />
                            {fieldError("source_urls")}
                        </label>
                        <label className={labelClass}>
                            Checked on
                            <input type="date" value={editing.form.last_verified_at} onChange={(event) => update("last_verified_at", event.target.value)} className={inputClass} />
                            {fieldError("last_verified_at")}
                        </label>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-5">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={editing.form.art_reviewed} onChange={(event) => update("art_reviewed", event.target.checked)} className="h-4 w-4" />
                            Art reviewed: users would say &ldquo;that&apos;s my card&rdquo;, designers &ldquo;a different drawing&rdquo;
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={editing.form.hidden} onChange={(event) => update("hidden", event.target.checked)} className="h-4 w-4" />
                            Hidden from Add card
                        </label>
                        <RoleGate minimum="support" fallback={<span className="text-sm text-muted">Viewers can read the catalogue but not change it.</span>}>
                            <button
                                onClick={() => void save()}
                                disabled={saving}
                                className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" /> {saving ? "Saving…" : editing.isNew ? "Add card" : "Save card"}
                            </button>
                        </RoleGate>
                    </div>
                </section>
            )}

            <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="sr-only" htmlFor="card-bank-filter">
                        Bank
                    </label>
                    <select id="card-bank-filter" value={issuer} onChange={(event) => setIssuer(event.target.value)} className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm">
                        <option value="">All banks</option>
                        {CARD_ISSUERS.filter(([id]) => banks.has(id)).map(([id, name]) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search cards"
                        aria-label="Search cards"
                        className="min-h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm"
                    />
                </div>
                <DataTable
                    rows={visible}
                    empty="No cards match."
                    columns={[
                        {
                            key: "card",
                            label: "Card",
                            render: (row) => (
                                <button
                                    className="text-left"
                                    onClick={() => {
                                        setFieldErrors({});
                                        setEditing({ form: toCardProductForm(row), isNew: false });
                                    }}
                                >
                                    <span className="block font-bold underline-offset-2 hover:underline">
                                        {issuerName(row.issuer_id)} {row.name}
                                    </span>
                                    <span className="font-mono text-xs text-muted">{row.id}</span>
                                </button>
                            ),
                        },
                        {
                            key: "art",
                            label: "Sketch",
                            render: (row) => (
                                <span className="text-xs">
                                    <span className="font-mono">{row.drawing}</span>
                                    <span className="text-muted">
                                        {" "}
                                        · {row.tone}
                                        {row.orientation === "portrait" ? " · portrait" : ""}
                                    </span>
                                    {row.art_idea ? <span className="block text-muted">{row.art_idea}</span> : null}
                                </span>
                            ),
                        },
                        {
                            key: "fees",
                            label: "Annual fee / waiver",
                            render: (row) => (
                                <span className="whitespace-nowrap tabular-nums">
                                    {rupees(row.annual_fee)} <span className="text-muted">/ {rupees(row.fee_waiver_spend)}</span>
                                </span>
                            ),
                        },
                        {
                            key: "checked",
                            label: "Checked",
                            render: (row) => {
                                const age = verificationAge(row.last_verified_at);
                                return (
                                    <span className={age === "stale" ? "text-negative" : age === "due" ? "text-warning" : age === "never" ? "text-muted" : ""}>
                                        {row.last_verified_at ? formatDate(row.last_verified_at) : "Never"}
                                    </span>
                                );
                            },
                        },
                        { key: "cards", label: "Users' cards", className: "tabular-nums", render: (row) => catalogue?.cards_by_product[row.id] ?? 0 },
                        {
                            key: "status",
                            label: "Status",
                            render: (row) => (
                                <span className="flex flex-wrap gap-1.5 text-xs font-semibold">
                                    {row.hidden ? <span className="rounded-full bg-track px-2 py-0.5">Hidden</span> : null}
                                    <span className={`rounded-full px-2 py-0.5 ${row.art_reviewed ? "bg-positive/15 text-positive" : "bg-track text-muted"}`}>
                                        {row.art_reviewed ? "Art reviewed" : "Art not reviewed"}
                                    </span>
                                </span>
                            ),
                        },
                    ]}
                />
            </section>
        </div>
    );
}
