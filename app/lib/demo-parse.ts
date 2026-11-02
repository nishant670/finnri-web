/**
 * The landing page's "Try it" phone: a pretend version of what the app's AI
 * capture does, worked out in the browser so a visitor can play with it without
 * an account, a credit or a network call. It only has to be convincing for the
 * short sentences people type into a demo; anything it cannot place is left
 * flagged for checking, which is the app's real behaviour too.
 */

export type DemoCategory =
    | "Food & Drinks"
    | "Transport"
    | "Bills"
    | "Shopping"
    | "Entertainment"
    | "Groceries"
    | "Health"
    | "Income"
    | "General";

export interface DemoDraft {
    type: "expense" | "income";
    /** Whole rupees; null when the sentence carries no amount. */
    amount: number | null;
    title: string;
    category: DemoCategory;
    /** null when the sentence does not say how it was paid. */
    paidVia: "UPI" | "Card" | "Cash" | null;
    date: "Today" | "Yesterday";
}

const CATEGORY_WORDS: [DemoCategory, RegExp][] = [
    ["Groceries", /\b(grocer(y|ies)|vegetables?|sabzi|milk|blinkit|zepto|bigbasket|instamart|dmart)\b/],
    ["Food & Drinks", /\b(lunch|dinner|breakfast|coffee|chai|tea|snacks?|food|pizza|biryani|zomato|swiggy|restaurant|cafe|drinks?|beer)\b/],
    ["Transport", /\b(uber|ola|rapido|auto|cab|taxi|metro|bus|train|petrol|diesel|fuel|parking|toll|flight)\b/],
    ["Bills", /\b(rent|electricity|bill|wifi|internet|broadband|recharge|gas|water|emi|insurance|maintenance)\b/],
    ["Shopping", /\b(amazon|flipkart|myntra|shoes?|shirt|clothes|jeans|dress|gift|headphones|phone)\b/],
    ["Entertainment", /\b(movie|netflix|spotify|prime|hotstar|concert|game|tickets?)\b/],
    ["Health", /\b(medicine|pharmacy|doctor|hospital|gym|chemist)\b/],
];

const INCOME_WORDS = /\b(got|received|salary|freelance|refund|cashback|credited|earned|bonus|sold)\b/;

/** Reads "250", "1,200", "2k", "1.5k", "₹ 499" and "rs 80" — the first one wins. */
function readAmount(text: string): number | null {
    const match = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)\s*(k|thousand|lakh)?\b/);
    if (!match) return null;
    let value = Number(match[1].replace(/,/g, ""));
    if (match[2] === "k" || match[2] === "thousand") value *= 1000;
    if (match[2] === "lakh") value *= 100000;
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/** "lunch at Haldiram's" → "Haldiram's"; otherwise the category's most telling word. */
function readTitle(text: string, original: string, category: DemoCategory): string {
    const place = original.match(/\b(?:at|from)\s+([A-Za-z][\w'&]*(?:\s+[A-Z][\w'&]*)*)/);
    if (place && !/^(the|my|a|an)$/i.test(place[1])) return capitalise(place[1]);
    for (const [, words] of CATEGORY_WORDS) {
        const word = text.match(words);
        if (word) return capitalise(word[0]);
    }
    const income = text.match(INCOME_WORDS);
    if (income && category === "Income") {
        const what = text.match(/\b(salary|freelance|refund|cashback|bonus)\b/);
        return what ? capitalise(what[0]) : "Money in";
    }
    return "Expense";
}

function capitalise(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function parseDemoSentence(input: string): DemoDraft {
    const original = input.trim();
    const text = original.toLowerCase();
    const isIncome = INCOME_WORDS.test(text);
    const category: DemoCategory = isIncome
        ? "Income"
        : CATEGORY_WORDS.find(([, words]) => words.test(text))?.[0] ?? "General";
    const paidVia = /\b(upi|gpay|google pay|phonepe|paytm|bhim)\b/.test(text)
        ? "UPI"
        : /\b(card|credit|debit)\b/.test(text)
            ? "Card"
            : /\b(cash|nakad)\b/.test(text)
                ? "Cash"
                : null;
    return {
        type: isIncome ? "income" : "expense",
        amount: readAmount(text),
        title: readTitle(text, original, category),
        category,
        paidVia,
        date: /\b(yesterday|kal)\b/.test(text) ? "Yesterday" : "Today",
    };
}
