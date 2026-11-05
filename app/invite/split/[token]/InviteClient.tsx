"use client";

import BrandMark from "@/app/components/ui/BrandMark";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Loader2, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiErrorMessage, isApiUnreachable, SplitAPI, type SplitInvitePreview } from "@/app/lib/api";
import { rememberAuthReturnTo } from "@/app/lib/auth-return";
import { androidInviteIntentURL, joinedGroupPath, playStoreInviteURL } from "@/app/lib/split-invite";
import { PLAY_STORE_LISTED, PLAY_STORE_URL } from "@/app/lib/site";

/**
 * Two different failures reach this screen and they are not interchangeable.
 *
 * "unavailable" is the server's verdict: the token is revoked, expired, or was
 * never real. "unreachable" is no verdict at all — the recipient is on a train,
 * or the API is down. Reporting the second as the first tells someone holding a
 * perfectly good invite that it is dead, and they will not open it again. This
 * is the most-shared page in the product, opened by people who do not yet have
 * an account, so it is also the one place where being wrong costs a user.
 */
type Phase =
    | { name: "loading" }
    | { name: "ready"; invite: SplitInvitePreview }
    | { name: "unavailable" }
    | { name: "unreachable"; message: string };

export default function InviteClient({ token }: { token: string }) {
    const router = useRouter();
    const { token: authToken, isLoading: authLoading } = useAuth();
    const [phase, setPhase] = useState<Phase>({ name: "loading" });
    const [accepting, setAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState("");
    const deepLink = `finnri://invite/split/${encodeURIComponent(token)}`;
    // Read after mount so the server render and the first client render agree.
    const [isAndroid, setIsAndroid] = useState(false);
    useEffect(() => { setIsAndroid(/Android/i.test(navigator.userAgent)); }, []);
    // On Android the open button is an intent: the app if it is installed,
    // otherwise the Play Store with this invite riding along, so the app opens
    // straight to it after installing. Elsewhere it stays the plain scheme.
    const androidIntent = PLAY_STORE_LISTED && isAndroid ? androidInviteIntentURL(PLAY_STORE_URL, token) : null;
    const openAppHref = androidIntent ?? deepLink;

    const load = useCallback(async () => {
        setPhase({ name: "loading" });
        try {
            const { data } = await SplitAPI.previewInvite(token);
            setPhase({ name: "ready", invite: data });
        } catch (error) {
            setPhase(isApiUnreachable(error)
                ? { name: "unreachable", message: apiErrorMessage(error, "We could not load this invitation.") }
                : { name: "unavailable" });
        }
    }, [token]);

    useEffect(() => { void load(); }, [load]);

    const continueOnWeb = async () => {
        const returnPath = `/invite/split/${encodeURIComponent(token)}`;
        if (!authToken) {
            rememberAuthReturnTo(returnPath);
            router.push("/login");
            return;
        }
        setAccepting(true);
        setAcceptError("");
        try {
            await SplitAPI.acceptInvite(token);
            router.replace(joinedGroupPath(phase.name === "ready" ? phase.invite.group_id : null));
        } catch (error) {
            setAcceptError(apiErrorMessage(error, "Finnri could not join this group."));
        } finally {
            setAccepting(false);
        }
    };

    return (
        <main className="font-body grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
            <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                <header className="flex items-center justify-center border-b border-border p-6">
                    <Link href="/" aria-label="Finnri home"><BrandMark compact tagline={false} /></Link>
                </header>

                <div className="p-7 text-center sm:p-10">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent"><Users className="h-8 w-8" /></span>

                    {phase.name === "loading" && (
                        <div className="mt-8" role="status">
                            <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" />
                            <span className="sr-only">Loading invitation</span>
                        </div>
                    )}

                    {phase.name === "ready" && (
                        <>
                            <p className="mt-7 text-sm font-bold uppercase tracking-[0.14em] text-eyebrow">Split group invitation</p>
                            <h1 className="mt-3 text-4xl font-bold font-display">Join {phase.invite.group_name}</h1>
                            <p className="mx-auto mt-4 max-w-md leading-7 text-muted">{phase.invite.owner_name} invited you to track shared expenses with {phase.invite.member_count} {phase.invite.member_count === 1 ? "person" : "people"} on Finnri.</p>
                        </>
                    )}

                    {phase.name === "unreachable" && (
                        <>
                            <h1 className="mt-7 text-3xl font-bold font-display">We couldn&apos;t load this invitation.</h1>
                            {/* Deliberately not "expired": nothing here says the invite is
                                bad, only that we could not ask. */}
                            <p className="mx-auto mt-4 max-w-md leading-7 text-muted">This is a connection problem, not an expired invite. The link will still work.</p>
                            <p role="status" className="mt-4 text-sm text-muted">{phase.message}</p>
                        </>
                    )}

                    {phase.name === "unavailable" && (
                        <>
                            <h1 className="mt-7 text-3xl font-bold font-display">This invite is no longer available.</h1>
                            <p className="mx-auto mt-4 max-w-md leading-7 text-muted">It may have been revoked or already used. Ask the sender for a new Finnri split-group link.</p>
                        </>
                    )}

                    {acceptError && <p role="alert" className="mt-5 rounded-2xl bg-negative/10 p-4 text-sm font-semibold text-negative">{acceptError}</p>}

                    {phase.name === "ready" && (
                        <div className="mt-8 grid gap-3">
                            <a href={openAppHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 font-bold text-on-accent">Open in the Finnri app <ExternalLink className="h-4 w-4" /></a>
                            <button disabled={accepting || authLoading} onClick={() => void continueOnWeb()} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-border px-6 font-bold disabled:opacity-60">{accepting ? <Loader2 className="h-5 w-5 animate-spin" /> : authToken ? "Join on the web" : "Sign in and continue on the web"}<ArrowRight className="h-4 w-4" /></button>
                        </div>
                    )}

                    {phase.name === "unreachable" && (
                        <div className="mt-8 grid gap-3">
                            <button onClick={() => void load()} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 font-bold text-on-accent">Try again <RefreshCw className="h-4 w-4" /></button>
                            {/* Worth offering even without a preview: the app holds the
                                token and can resolve the invite on its own network. */}
                            <a href={openAppHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-border px-6 font-bold">Open in the Finnri app <ExternalLink className="h-4 w-4" /></a>
                        </div>
                    )}

                    {phase.name === "unavailable" && (
                        <div className="mt-8 grid gap-3">
                            <Link href="/" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-border px-6 font-bold">See what Finnri does <ArrowRight className="h-4 w-4" /></Link>
                        </div>
                    )}

                    {/* Outside every branch on purpose. Whatever happened to the
                        invite, this page is still the first thing a stranger has ever
                        seen of Finnri, and it used to hide the only route into the
                        product behind a successful preview fetch. */}
                    {phase.name !== "loading" && (PLAY_STORE_LISTED ? (
                        <a href={phase.name === "unavailable" ? PLAY_STORE_URL : playStoreInviteURL(PLAY_STORE_URL, token)} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 items-center justify-center text-sm font-bold text-eyebrow hover:underline">Get Finnri on Google Play</a>
                    ) : (
                        <Link href="/login" className="mt-5 inline-flex min-h-12 items-center justify-center text-sm font-bold text-eyebrow hover:underline">Use Finnri on the web</Link>
                    ))}
                </div>
            </section>
        </main>
    );
}
