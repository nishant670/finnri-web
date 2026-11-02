"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
    ArrowUp,
    Bell,
    Camera,
    Check,
    ChevronRight,
    CircleUser,
    House,
    Lock,
    Mic,
    Moon,
    MousePointerClick,
    Pencil,
    Plus,
    Sparkles,
    Sun,
    TrendingUp,
    Users,
    Wallet,
    X,
} from "lucide-react";
import PhoneFrame from "@/app/components/marketing/PhoneFrame";
import { categoryVisual } from "@/app/components/ui/CategoryTile";
import { parseDemoSentence, type DemoDraft } from "@/app/lib/demo-parse";
import { cn } from "@/app/lib/utils";

/**
 * The hero's phone: the app's Home screen rebuilt in HTML so it stays sharp,
 * can move, and can be played with. On its own it runs a short tour (a spoken
 * sentence becomes a draft, the draft is saved); "Try it yourself" hands the
 * visitor a text box and the same draft sheet. Nothing leaves the page — the
 * parsing is `parseDemoSentence`, not the real AI.
 */

type MoodId = "finnri" | "mint" | "sky" | "plum";

interface Surface { bg: string; text: string; selected: string; card: string; border: string }

// The app's four moods (finnri-app constants/theme.ts), with the approved
// deeper Sky and Plum accents that carry white text.
const MOODS: Record<MoodId, { label: string; accent: string; onAccent: string; light: Surface; dark: Surface }> = {
    finnri: {
        label: "Finnri", accent: "#FF8865", onAccent: "#2D2D2D",
        light: { bg: "#FDF5F7", text: "#2D2D2D", selected: "#FFE8E5", card: "#FFFFFF", border: "#F0E5E7" },
        dark: { bg: "#1A1A1A", text: "#FAFAFA", selected: "#3A2A25", card: "#242424", border: "#3C3C3C" },
    },
    mint: {
        label: "Mint", accent: "#17A978", onAccent: "#0F2A20",
        light: { bg: "#F3FBF7", text: "#182C24", selected: "#DDF6EA", card: "#FFFFFF", border: "#D7EEE3" },
        dark: { bg: "#0F1D19", text: "#F1FFF8", selected: "#17362B", card: "#162621", border: "#28483D" },
    },
    sky: {
        label: "Sky", accent: "#1F6FD6", onAccent: "#FFFFFF",
        light: { bg: "#F4F9FE", text: "#172437", selected: "#DCEEFF", card: "#FFFFFF", border: "#D7E7F7" },
        dark: { bg: "#101A25", text: "#F2F8FF", selected: "#172C42", card: "#172331", border: "#29425E" },
    },
    plum: {
        label: "Plum", accent: "#8B3FD9", onAccent: "#FFFFFF",
        light: { bg: "#FCF6FD", text: "#2E2134", selected: "#F0DDF8", card: "#FFFFFF", border: "#EBDCF0" },
        dark: { bg: "#1F1724", text: "#FFF6FF", selected: "#35213F", card: "#291E30", border: "#47304F" },
    },
};

const TOUR = [
    "Spent 250 on lunch via UPI",
    "Uber 180 to office, paid by card",
    "Got 2000 from freelance",
    "Groceries 640 at DMart, cash",
];

const SUGGESTIONS = ["Chai 20 cash", "Netflix 499 on card", "1.2k dinner at Toit yesterday"];

interface Entry { id: number; title: string; category: string; paidVia: string; amount: number; income: boolean; when: string; fresh?: boolean }

const START_ENTRIES: Entry[] = [
    { id: 1, title: "Coffee with Priya", category: "Food & Drinks", paidVia: "UPI", amount: 180, income: false, when: "9:12 am" },
    { id: 2, title: "Metro recharge", category: "Transport", paidVia: "UPI", amount: 500, income: false, when: "Yesterday" },
    { id: 3, title: "Electricity bill", category: "Bills", paidVia: "Card", amount: 1000, income: false, when: "2 Nov" },
];

// Adds up to the ₹8,140 the month card opens on.
const START_SPEND: Record<string, number> = { "Food & Drinks": 3250, Shopping: 2000, Transport: 1890, Bills: 1000 };

/** The demo's own categories, drawn with the app's nearest tile. */
const TILE_FOR: Record<string, string> = { Groceries: "Shopping", Health: "Misc", Income: "Freelance", General: "Misc" };

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CANCELLED = Symbol("cancelled");

function Tile({ category, size = 30 }: { category: string; size?: number }) {
    const { icon: Icon, hue } = categoryVisual(TILE_FOR[category] ?? category);
    return (
        <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-[9px]" style={{ width: size, height: size, backgroundColor: `color-mix(in srgb, ${hue} 18%, transparent)`, color: hue }}>
            <Icon className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </span>
    );
}

/** Tweens from the last value shown to the new one. */
function CountUp({ value }: { value: number }) {
    const [shown, setShown] = useState(value);
    const from = useRef(value);
    useEffect(() => {
        const start = performance.now();
        const origin = from.current;
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 700);
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(origin + (value - origin) * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
            else from.current = value;
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return <>{rupees(shown)}</>;
}

export default function HeroDemo() {
    const [mood, setMood] = useState<MoodId>("finnri");
    const [dark, setDark] = useState(false);
    const [mode, setMode] = useState<"tour" | "try">("tour");
    const [stage, setStage] = useState<"idle" | "listening" | "draft">("idle");
    const [transcript, setTranscript] = useState("");
    const [draft, setDraft] = useState<DemoDraft | null>(null);
    const [said, setSaid] = useState("");
    const [fieldsShown, setFieldsShown] = useState(0);
    const [pressing, setPressing] = useState(false);
    const [entries, setEntries] = useState(START_ENTRIES);
    const [spend, setSpend] = useState(START_SPEND);
    const [typed, setTyped] = useState("");
    const [amountText, setAmountText] = useState("");
    const [amountError, setAmountError] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [inView, setInView] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const tourIndex = useRef(0);
    const nextId = useRef(100);

    useEffect(() => {
        const query = matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReducedMotion(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    // The tour only runs while the phone is on screen and the tab is visible.
    useEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && !document.hidden), { threshold: 0.25 });
        observer.observe(node);
        const onVisibility = () => setInView((current) => current && !document.hidden);
        document.addEventListener("visibilitychange", onVisibility);
        return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
    }, []);

    const commit = useCallback((entry: DemoDraft, amount: number) => {
        const category = entry.category;
        const id = nextId.current++;
        setEntries((current) => [
            { id, title: entry.title, category, paidVia: entry.paidVia ?? (entry.type === "income" ? "Bank" : "Cash"), amount, income: entry.type === "income", when: "Just now", fresh: true },
            ...current.map((row) => ({ ...row, fresh: false })),
        ].slice(0, 4));
        if (entry.type === "expense") setSpend((current) => ({ ...current, [category]: (current[category] ?? 0) + amount }));
    }, []);

    useEffect(() => {
        if (mode !== "tour" || !inView || reducedMotion) return;
        let cancelled = false;
        const step = async (ms: number) => { await sleep(ms); if (cancelled) throw CANCELLED; };
        (async () => {
            while (!cancelled) {
                const phrase = TOUR[tourIndex.current % TOUR.length];
                await step(1400);
                setStage("listening");
                setTranscript("");
                await step(500);
                for (let i = 1; i <= phrase.length; i += 1) {
                    setTranscript(phrase.slice(0, i));
                    await step(36);
                }
                await step(450);
                const parsed = parseDemoSentence(phrase);
                setSaid(phrase);
                setDraft(parsed);
                setFieldsShown(0);
                setStage("draft");
                for (let field = 1; field <= 4; field += 1) {
                    await step(240);
                    setFieldsShown(field);
                }
                await step(1500);
                setPressing(true);
                await step(240);
                setPressing(false);
                commit(parsed, parsed.amount ?? 0);
                setStage("idle");
                setDraft(null);
                setTranscript("");
                tourIndex.current += 1;
                await step(2200);
            }
        })().catch((error) => { if (error !== CANCELLED) throw error; });
        return () => { cancelled = true; };
    }, [mode, inView, reducedMotion, commit]);

    const enterTry = () => {
        setMode("try");
        setStage("idle");
        setDraft(null);
        setTranscript("");
        setPressing(false);
        if (phoneRef.current) phoneRef.current.style.transform = "";
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    const exitTry = () => {
        setMode("tour");
        setDraft(null);
        setStage("idle");
        setTyped("");
    };

    const submit = (event?: FormEvent, text = typed) => {
        event?.preventDefault();
        const sentence = text.trim();
        if (!sentence) return;
        const parsed = parseDemoSentence(sentence);
        setSaid(sentence);
        setDraft(parsed);
        setAmountText(parsed.amount != null ? String(parsed.amount) : "");
        setAmountError(false);
        setFieldsShown(4);
        setStage("draft");
        setTyped("");
        if (parsed.amount == null) requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
    };

    const save = () => {
        if (!draft) return;
        const amount = Number(amountText.replace(/,/g, ""));
        if (!Number.isFinite(amount) || amount <= 0) {
            setAmountError(true);
            amountRef.current?.focus({ preventScroll: true });
            return;
        }
        commit(draft, Math.round(amount));
        setDraft(null);
        setStage("idle");
        setToast("Saved — in this tab only. It’s a demo.");
        setTimeout(() => setToast(null), 2600);
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    const discard = () => {
        setDraft(null);
        setStage("idle");
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };

    // A gentle tilt toward the pointer during the tour.
    const onPointerMove = (event: React.PointerEvent) => {
        if (mode !== "tour" || reducedMotion || event.pointerType !== "mouse" || !phoneRef.current) return;
        const box = phoneRef.current.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        phoneRef.current.style.transform = `perspective(1600px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
    };
    const onPointerLeave = () => { if (phoneRef.current) phoneRef.current.style.transform = ""; };

    const palette = MOODS[mood];
    const surface = dark ? palette.dark : palette.light;
    const screenStyle = {
        "--p-bg": surface.bg,
        "--p-text": surface.text,
        "--p-muted": `color-mix(in srgb, ${surface.text} 66%, transparent)`,
        "--p-card": surface.card,
        "--p-border": surface.border,
        "--p-selected": surface.selected,
        "--p-accent": palette.accent,
        "--p-on-accent": palette.onAccent,
        "--p-negative": dark ? "#FB7185" : "#C43D52",
        "--p-positive": dark ? "#6EE7B7" : "#16825D",
        background: "var(--p-bg)",
        color: "var(--p-text)",
    } as CSSProperties;

    const monthTotal = Object.values(spend).reduce((sum, value) => sum + value, 0);
    const [topCategory, topAmount] = Object.entries(spend).sort((a, b) => b[1] - a[1])[0];
    const listening = stage === "listening";

    return (
        <div ref={rootRef} className="relative mx-auto w-[300px]">
            <div
                ref={phoneRef}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                className="group relative transition-transform duration-300 ease-out will-change-transform"
            >
                <PhoneFrame statusTone={dark ? "light" : "dark"} screenStyle={screenStyle} screenClassName="transition-colors duration-500">
                    <div className="absolute inset-0 flex flex-col pt-9 font-body text-[11px] leading-snug" aria-hidden={mode === "tour"}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-3.5 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="grid h-8 w-8 place-items-center rounded-[10px] text-[13px] font-black transition-colors duration-500" style={{ background: "var(--p-accent)", color: "var(--p-on-accent)" }}>A</span>
                                <div>
                                    <p style={{ color: "var(--p-muted)" }}>Hey there,</p>
                                    <p className="text-[13px] font-bold">Aanya!</p>
                                </div>
                            </div>
                            <span className="relative">
                                <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
                                <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] font-bold" style={{ background: "var(--p-accent)", color: "var(--p-on-accent)" }}>2</span>
                            </span>
                        </div>

                        {/* Month card */}
                        <div className="mx-3 rounded-2xl border px-3.5 py-3" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                            <div className="flex items-center justify-between" style={{ color: "var(--p-muted)" }}>
                                <span>November so far</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </div>
                            <p className="mt-0.5 text-[24px] font-bold tabular-nums tracking-tight"><CountUp value={monthTotal} /></p>
                            <p className="mt-0.5 text-[10.5px]" style={{ color: "var(--p-muted)" }}>
                                <span className="font-semibold" style={{ color: "var(--p-text)" }}>{topCategory}</span> {rupees(topAmount)} · most of your spend
                            </p>
                        </div>

                        {/* Tap and speak */}
                        <div className="mx-3 mt-2.5 rounded-2xl border" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                            <div className="flex items-center gap-3 px-3 py-3">
                                <span className="relative grid h-12 w-12 shrink-0 place-items-center">
                                    {listening && (
                                        <>
                                            <span className="mic-ring absolute inset-0 rounded-full" style={{ background: "var(--p-accent)" }} />
                                            <span className="mic-ring absolute inset-0 rounded-full" style={{ background: "var(--p-accent)", animationDelay: "0.8s" }} />
                                        </>
                                    )}
                                    <span className={cn("relative grid h-12 w-12 place-items-center rounded-full shadow-lg transition-transform duration-300", listening && "scale-110")} style={{ background: "var(--p-accent)", color: "var(--p-on-accent)", boxShadow: "0 0 0 5px var(--p-selected)" }}>
                                        <Mic className="h-5 w-5" strokeWidth={2.2} />
                                    </span>
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold">{listening ? "Listening…" : "Tap and speak"}</p>
                                    <p className="mt-0.5 min-h-[28px] text-[10.5px]" style={{ color: "var(--p-muted)" }}>
                                        {listening ? (
                                            <span style={{ color: "var(--p-text)" }}>“{transcript}<span className="caret">|</span>”</span>
                                        ) : (
                                            <>Talk the way you normally would. <span className="italic">“Spent 250 on food via UPI”</span></>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex border-t text-[11px] font-medium" style={{ borderColor: "var(--p-border)" }}>
                                <span className="flex flex-1 items-center gap-1.5 px-3 py-2"><Pencil className="h-3.5 w-3.5" /> Type instead</span>
                                <span className="flex flex-1 items-center justify-end gap-1.5 border-l px-3 py-2" style={{ borderColor: "var(--p-border)" }}><Camera className="h-3.5 w-3.5" /> Scan a bill</span>
                            </div>
                        </div>

                        {/* Recent activity */}
                        <div className="mt-3 flex items-center justify-between px-3.5">
                            <p className="text-[12px] font-bold">Recent activity</p>
                            <span className="flex items-center gap-0.5" style={{ color: "var(--p-muted)" }}>See all <ChevronRight className="h-3 w-3" /></span>
                        </div>
                        <ul className="mx-3 mt-1.5 overflow-hidden rounded-2xl border" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                            {entries.map((row, index) => (
                                <li
                                    key={row.id}
                                    className={cn("flex items-center gap-2.5 px-3 py-2", index > 0 && "border-t", row.fresh && "row-in")}
                                    style={{ borderColor: "var(--p-border)", background: row.fresh ? "color-mix(in srgb, var(--p-selected) 70%, transparent)" : undefined, transition: "background 1.5s ease" }}
                                >
                                    <Tile category={row.category} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11.5px] font-semibold">{row.title}</p>
                                        <p className="truncate text-[10px]" style={{ color: "var(--p-muted)" }}>{row.category} · {row.paidVia}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11.5px] font-semibold tabular-nums" style={{ color: row.income ? "var(--p-positive)" : undefined }}>{row.income ? "+" : "−"}{rupees(row.amount)}</p>
                                        <p className="text-[9.5px]" style={{ color: "var(--p-muted)" }}>{row.when}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Floating add button and tab bar */}
                        <span className="absolute bottom-[60px] right-3 grid h-11 w-11 place-items-center rounded-full shadow-lg" style={{ background: "var(--p-accent)", color: "var(--p-on-accent)" }}><Plus className="h-5 w-5" strokeWidth={2.4} /></span>
                        <nav className="absolute inset-x-0 bottom-0 flex h-[52px] items-start justify-around border-t pb-2 pt-1.5 text-[9.5px]" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-muted)" }}>
                            {[
                                { icon: TrendingUp, label: "Insights" },
                                { icon: Wallet, label: "Money" },
                                { icon: House, label: "Home", active: true },
                                { icon: Users, label: "Splits" },
                                { icon: CircleUser, label: "Profile" },
                            ].map(({ icon: Icon, label, active }) => (
                                <span key={label} className="flex flex-col items-center gap-0.5" style={active ? { color: "var(--p-accent)", fontWeight: 700 } : undefined}>
                                    <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.3 : 1.8} />
                                    {label}
                                </span>
                            ))}
                        </nav>
                    </div>

                    {/* The draft sheet */}
                    <div className={cn("absolute inset-0 z-20 transition-colors duration-300", draft ? "bg-black/35" : "pointer-events-none bg-transparent")} aria-hidden={!draft}>
                        <div
                            role={mode === "try" && draft ? "dialog" : undefined}
                            aria-label={mode === "try" && draft ? "Check this draft" : undefined}
                            className={cn("absolute inset-x-0 bottom-0 rounded-t-[22px] px-3.5 pb-4 pt-2.5 font-body text-[11px] shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]", draft ? "translate-y-0" : "translate-y-full")}
                            style={{ background: "var(--p-card)" }}
                        >
                            <span className="mx-auto mb-2.5 block h-1 w-9 rounded-full" style={{ background: "var(--p-border)" }} />
                            {draft && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <p className="flex items-center gap-1.5 text-[13px] font-bold"><Sparkles className="h-3.5 w-3.5" style={{ color: "var(--p-accent)" }} /> Check this draft</p>
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--p-selected)" }}>{draft.type === "income" ? "Income" : "Expense"}</span>
                                    </div>
                                    <p className="mt-1 truncate text-[10.5px]" style={{ color: "var(--p-muted)" }}>You said “{said}”</p>

                                    <div className="mt-2.5 flex items-baseline gap-1.5">
                                        {mode === "try" ? (
                                            <label className="flex items-baseline gap-0.5 text-[28px] font-bold tabular-nums tracking-tight">
                                                <span>₹</span>
                                                <input
                                                    ref={amountRef}
                                                    inputMode="decimal"
                                                    aria-label="Amount"
                                                    value={amountText}
                                                    onChange={(event) => { setAmountText(event.target.value.replace(/[^\d.,]/g, "")); setAmountError(false); }}
                                                    placeholder="0"
                                                    className="w-[150px] bg-transparent outline-none placeholder:opacity-40"
                                                    style={{ color: "var(--p-text)" }}
                                                />
                                            </label>
                                        ) : (
                                            <p className="text-[28px] font-bold tabular-nums tracking-tight">{draft.amount != null ? rupees(draft.amount) : "₹—"}</p>
                                        )}
                                    </div>
                                    {mode === "try" && (amountError || draft.amount == null) && (
                                        <p className="text-[10px] font-semibold" style={{ color: "var(--p-negative)" }}>{amountError ? "Add an amount to save this." : "No amount heard — add one."}</p>
                                    )}

                                    <dl className="mt-2 divide-y rounded-xl border" style={{ borderColor: "var(--p-border)" }}>
                                        {[
                                            { label: "Category", value: <span className="flex items-center gap-1.5"><Tile category={draft.category} size={20} />{draft.category}</span>, check: draft.category === "General" },
                                            { label: "Title", value: draft.title, check: false },
                                            { label: "Paid via", value: draft.paidVia ?? "Not said", check: draft.paidVia == null },
                                            { label: "Date", value: draft.date, check: false },
                                        ].map((field, index) => (
                                            <div
                                                key={field.label}
                                                className={cn("flex items-center justify-between gap-2 px-2.5 py-2 transition-all duration-300", index < fieldsShown ? "opacity-100" : "translate-x-2 opacity-0")}
                                                style={{ borderColor: "var(--p-border)" }}
                                            >
                                                <dt style={{ color: "var(--p-muted)" }}>{field.label}</dt>
                                                <dd className="flex min-w-0 items-center gap-1.5 font-semibold">
                                                    <span className="truncate">{field.value}</span>
                                                    {field.check && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-bold text-amber-800">Check</span>}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
                                        <button type="button" tabIndex={mode === "try" ? 0 : -1} onClick={discard} className="h-9 rounded-full border text-[11.5px] font-semibold" style={{ borderColor: "var(--p-border)" }}>Discard</button>
                                        <button
                                            type="button"
                                            tabIndex={mode === "try" ? 0 : -1}
                                            onClick={save}
                                            className={cn("flex h-9 items-center justify-center gap-1 rounded-full text-[11.5px] font-bold transition-transform duration-200", pressing && "scale-95")}
                                            style={{ background: "var(--p-accent)", color: "var(--p-on-accent)" }}
                                        >
                                            <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Looks right — save
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Try mode: a composer docked above the tab bar */}
                    {mode === "try" && !draft && (
                        <form onSubmit={submit} className="absolute inset-x-2 bottom-[58px] z-10 font-body">
                            <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button key={suggestion} type="button" onClick={() => submit(undefined, suggestion)} className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-sm" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full border p-1 pl-3 shadow-lg" style={{ background: "var(--p-card)", borderColor: "var(--p-accent)" }}>
                                <input
                                    ref={inputRef}
                                    value={typed}
                                    onChange={(event) => setTyped(event.target.value)}
                                    onKeyDown={(event) => { if (event.key === "Escape") exitTry(); }}
                                    placeholder="Type it like a message…"
                                    aria-label="Describe a transaction"
                                    maxLength={80}
                                    className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:opacity-60 sm:text-[12px]"
                                    style={{ color: "var(--p-text)" }}
                                />
                                <button type="submit" aria-label="Make a draft" className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--p-accent)", color: "var(--p-on-accent)" }}>
                                    <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                                </button>
                            </div>
                        </form>
                    )}

                    {toast && (
                        <div role="status" className="absolute inset-x-3 top-10 z-30 rounded-xl bg-zinc-900/95 px-3 py-2 text-center font-body text-[11px] font-semibold text-white shadow-lg">{toast}</div>
                    )}

                    {/* Tour mode: hover invites a try. Keyboard users get the button below the phone. */}
                    {mode === "tour" && (
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            onClick={enterTry}
                            className="absolute inset-0 z-20 flex cursor-pointer items-end justify-center bg-gradient-to-t from-black/45 via-black/5 to-transparent pb-24 opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
                        >
                            <span className="flex translate-y-2 items-center gap-2 rounded-full bg-white px-4 py-2.5 font-body text-sm font-bold text-zinc-900 shadow-2xl transition-transform duration-300 group-hover:translate-y-0">
                                <MousePointerClick className="h-4 w-4" /> Try it yourself
                            </span>
                        </button>
                    )}
                </PhoneFrame>
            </div>

            {/* Floating notes around the phone; decoration only. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
                <div className="drift absolute -left-64 top-24 flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-3.5 py-2.5 text-sm font-semibold shadow-xl shadow-black/5 backdrop-blur" style={{ "--delay": "0ms" } as CSSProperties}>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-positive/15 text-positive"><Check className="h-4 w-4" strokeWidth={2.5} /></span>
                    Nothing saved without your OK
                </div>
                <div className="drift absolute -right-44 top-[40%] flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-3.5 py-2.5 text-sm font-semibold shadow-xl shadow-black/5 backdrop-blur" style={{ "--delay": "-2s" } as CSSProperties}>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-selected text-accent"><Lock className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
                    No bank login, ever
                </div>
                <div className="drift absolute -left-52 bottom-36 w-52 rounded-2xl border border-border bg-card/90 p-3.5 shadow-xl shadow-black/5 backdrop-blur" style={{ "--delay": "-4s" } as CSSProperties}>
                    <p className="text-xs text-muted">Goa trip · 4 people</p>
                    <p className="mt-0.5 text-sm font-semibold">You’re owed <span className="text-positive">₹8,850</span></p>
                    <div className="mt-2 flex -space-x-1.5">
                        {["A", "P", "R"].map((initial, index) => (
                            <span key={initial} className="grid h-6 w-6 place-items-center rounded-full border-2 border-card text-[10px] font-bold text-white" style={{ background: ["#F59E0B", "#EC4899", "#6366F1"][index] }}>{initial}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls under the phone */}
            <div className="mt-6 flex flex-col items-center gap-3 font-body">
                {mode === "tour" ? (
                    <button type="button" onClick={enterTry} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <MousePointerClick className="h-4 w-4 text-accent" /> Try it yourself <span className="font-medium text-muted">· no sign-up</span>
                    </button>
                ) : (
                    <button type="button" onClick={exitTry} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold shadow-sm transition hover:bg-track">
                        <X className="h-4 w-4" /> Back to the tour
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div role="radiogroup" aria-label="App mood" className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-sm">
                        {(Object.keys(MOODS) as MoodId[]).map((id) => (
                            <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={mood === id}
                                aria-label={`${MOODS[id].label} mood`}
                                title={MOODS[id].label}
                                onClick={() => setMood(id)}
                                className={cn("h-6 w-6 rounded-full transition-transform duration-200 hover:scale-110", mood === id && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}
                                style={{ background: MOODS[id].accent }}
                            />
                        ))}
                        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
                        <button type="button" onClick={() => setDark((value) => !value)} aria-pressed={dark} aria-label="Dark phone screen" className="grid h-6 w-6 place-items-center rounded-full text-muted transition hover:text-foreground">
                            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="whitespace-nowrap text-xs text-muted">Four moods, light or dark</p>
                </div>
            </div>
        </div>
    );
}
