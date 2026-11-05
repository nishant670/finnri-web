"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Mic, Sparkles } from "lucide-react";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { parseDemoSentence } from "@/app/lib/demo-parse";
import { cn } from "@/app/lib/utils";

/**
 * "Say it like you'd text it": one sentence at a time types itself out and
 * the draft beside it fills in, field by field, using the same parser as the
 * hero phone. It cycles only while on screen, in a visible tab, with motion
 * allowed; otherwise each example sits complete and the chips switch between
 * them. The server renders the first example complete, so it reads without
 * JavaScript too.
 */

const EXAMPLES = [
    "Chai 20 cash",
    "Netflix 499 on card",
    "Rent 22,000 via UPI",
    "Got 2000 from freelance",
    "Movie tickets 600 yesterday",
].map((sentence) => ({ sentence, draft: parseDemoSentence(sentence) }));

// The amount, then the four rows under it.
const FIELD_COUNT = 5;
const COMPLETE = Number.MAX_SAFE_INTEGER;

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export default function PhraseShowcase() {
    const rootRef = useRef<HTMLElement>(null);
    const [index, setIndex] = useState(0);
    const [typed, setTyped] = useState(COMPLETE);
    const [revealed, setRevealed] = useState(FIELD_COUNT);
    const [inView, setInView] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const query = matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReducedMotion(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && !document.hidden), { threshold: 0.35 });
        observer.observe(node);
        const onVisibility = () => setInView((current) => current && !document.hidden);
        document.addEventListener("visibilitychange", onVisibility);
        return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
    }, []);

    const animate = inView && !reducedMotion;

    useEffect(() => {
        if (!animate) return;
        const { sentence } = EXAMPLES[index];
        const timers: number[] = [];
        const at = (ms: number, run: () => void) => { timers.push(window.setTimeout(run, ms)); };
        at(0, () => { setTyped(0); setRevealed(0); });
        let time = 350;
        for (let length = 1; length <= sentence.length; length += 1) {
            at(time, () => setTyped(length));
            time += 55;
        }
        time += 350;
        for (let field = 1; field <= FIELD_COUNT; field += 1) {
            at(time, () => setRevealed(field));
            time += 220;
        }
        at(time + 2600, () => setIndex((current) => (current + 1) % EXAMPLES.length));
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [animate, index]);

    const choose = (next: number) => {
        if (next === index) return;
        if (!animate) { setTyped(COMPLETE); setRevealed(FIELD_COUNT); }
        setIndex(next);
    };

    const { sentence, draft } = EXAMPLES[index];
    const typing = typed < sentence.length;
    const rows: { label: string; value: ReactNode; uncertain?: boolean }[] = [
        { label: "What", value: draft.title },
        {
            label: "Category",
            value: (
                <span className="flex items-center gap-2">
                    <CategoryTile category={draft.category === "Income" ? "Freelance" : draft.category} size={22} />
                    {draft.category}
                </span>
            ),
        },
        { label: "Paid via", value: draft.paidVia ?? "Check", uncertain: draft.paidVia == null },
        { label: "When", value: draft.date },
    ];

    return (
        <section ref={rootRef} aria-labelledby="phrases-heading" className="relative overflow-hidden border-y border-border bg-card/40 py-16 sm:py-24">
            <div aria-hidden="true" className="bg-dot-field pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
            <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
                <div data-reveal className="mx-auto max-w-2xl text-center">
                    <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">Say it like you’d text it</p>
                    <h2 id="phrases-heading" className="font-display text-balance text-3xl font-bold leading-[1.08] sm:text-4xl">You talk. Finnri does the filing.</h2>
                </div>

                <div data-reveal style={{ "--reveal-delay": "120ms" } as CSSProperties} className="mt-10 grid items-center gap-3 sm:mt-14 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:gap-5">
                    {/* What you say */}
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent"><Mic className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
                            You say
                        </p>
                        <p className="font-display mt-5 min-h-[2.3em] text-balance text-[28px] font-bold leading-[1.15] sm:text-[34px]">
                            “{sentence.slice(0, typed)}
                            {typing ? <span aria-hidden="true" className="caret ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] rounded-full bg-accent" /> : "”"}
                        </p>
                    </div>

                    {/* The hand-off */}
                    <div aria-hidden="true" className="flex justify-center">
                        <span className={cn("grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-accent shadow-sm transition duration-500", !typing && revealed < FIELD_COUNT && "scale-110 shadow-[0_0_0_8px_color-mix(in_srgb,var(--accent)_15%,transparent)]")}>
                            <ArrowDown className="h-5 w-5 md:hidden" />
                            <ArrowRight className="hidden h-5 w-5 md:block" />
                        </span>
                    </div>

                    {/* What Finnri drafts */}
                    <div className="relative rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(20,10,5,0.35)] sm:p-8">
                        <p aria-hidden="true" className={cn("pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-muted transition-opacity duration-300", revealed > 0 && "opacity-0")}>
                            <span className="flex h-4 items-center gap-[3px]">
                                {[0, 1, 2, 3].map((bar) => <span key={bar} className="wave-bar h-full w-[3px] rounded-full bg-accent" style={{ animationDelay: `${bar * 120}ms` }} />)}
                            </span>
                            Listening…
                        </p>
                        <div className="flex items-center justify-between">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted"><Sparkles className="h-4 w-4 text-accent" /> Finnri drafts</p>
                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity duration-300", draft.type === "income" ? "bg-[#16A34A]/12 text-[#16A34A]" : "bg-selected", revealed < 1 && "opacity-0")}>
                                {draft.type === "income" ? "Income" : "Expense"}
                            </span>
                        </div>
                        <p className={cn("font-display mt-4 text-[40px] font-bold leading-none tabular-nums transition duration-500", revealed < 1 ? "translate-y-2 opacity-0" : "opacity-100")}>
                            {draft.amount != null ? rupees(draft.amount) : "₹—"}
                        </p>
                        <dl className="mt-5 divide-y divide-border border-t border-border text-[15px]">
                            {rows.map(({ label, value, uncertain }, row) => (
                                <div key={label} className={cn("flex min-h-11 items-center justify-between gap-4 py-2 transition duration-500", revealed < row + 2 ? "translate-x-2 opacity-0" : "opacity-100")}>
                                    <dt className="text-muted">{label}</dt>
                                    <dd className={cn("font-semibold", uncertain && "rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-sm text-[#B45309] dark:text-[#FBBF24]")}>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Examples">
                    {EXAMPLES.map((example, chip) => (
                        <button
                            key={example.sentence}
                            type="button"
                            onClick={() => choose(chip)}
                            aria-pressed={chip === index}
                            className={cn(
                                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-300",
                                chip === index ? "border-accent bg-accent text-on-accent shadow-[0_8px_20px_-10px_var(--accent)]" : "border-border bg-card text-muted hover:border-accent/60 hover:text-foreground",
                            )}
                        >
                            {example.sentence}
                        </button>
                    ))}
                </div>
                <p className="mt-5 text-center text-sm text-muted">Anything Finnri isn’t sure of is marked <span className="font-semibold text-[#B45309] dark:text-[#FBBF24]">Check</span> — nothing is saved until you OK it.</p>
            </div>
        </section>
    );
}
