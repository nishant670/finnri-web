"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/app/lib/utils";

declare global {
    interface Window {
        google?: {
            accounts?: {
                id?: {
                    initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void; nonce?: string }) => void;
                    renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
                };
            };
        };
    }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/**
 * Google's own sign-in button, sized to its container. Sign-in on the login
 * page and saving a guest workspace both go through it; the caller decides
 * what the credential is used for. Each mount gets a fresh nonce, which the
 * callback hands back so the API can check the token was minted for us.
 */
export default function GoogleSignInButton({ onCredential, onError, busy = false, text = "continue_with", className }: {
    onCredential: (credential: string, nonce: string) => void;
    onError?: (message: string) => void;
    busy?: boolean;
    text?: "continue_with" | "signin_with" | "signup_with";
    className?: string;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    // Google's script arrives a second or three after the page. Until it has
    // drawn, the slot below was an empty gap above "or … Continue as a guest",
    // which reads as if guest were the only way in.
    const [drawn, setDrawn] = useState(false);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // The latest handlers, read when Google calls back, so a re-render never re-mounts the button.
    const handlers = useRef({ onCredential, onError });
    useEffect(() => { handlers.current = { onCredential, onError }; }, [onCredential, onError]);

    useEffect(() => {
        const element = ref.current;
        if (!clientId || !element) return;
        const nonce = crypto.randomUUID();
        let renderedWidth = 0;

        const render = () => {
            if (!window.google?.accounts?.id || !ref.current) return false;
            const width = Math.min(Math.max(Math.floor(ref.current.getBoundingClientRect().width), 200), 400);
            if (width === renderedWidth && ref.current.childElementCount > 0) { setDrawn(true); return true; }
            renderedWidth = width;
            ref.current.innerHTML = "";
            window.google.accounts.id.initialize({
                client_id: clientId,
                nonce,
                callback: (response) => {
                    if (response.credential) handlers.current.onCredential(response.credential, nonce);
                    else handlers.current.onError?.("Google did not return a sign-in token.");
                },
            });
            // The page's own theme, which the root script and Settings both set
            // through `.dark`; the device setting alone would ignore a chosen Light.
            const dark = document.documentElement.classList.contains("dark");
            window.google.accounts.id.renderButton(ref.current, { type: "standard", theme: dark ? "filled_black" : "outline", size: "large", shape: "pill", text, width });
            setDrawn(true);
            return true;
        };

        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => requestAnimationFrame(() => { render(); })) : null;
        observer?.observe(element);
        // Redraw in the other theme when the page switches between light and dark.
        const themeObserver = new MutationObserver(() => { renderedWidth = 0; render(); });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        if (render()) return () => { observer?.disconnect(); themeObserver.disconnect(); };

        let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (!script) {
            script = document.createElement("script");
            script.src = SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
        const onLoad = () => { render(); };
        script.addEventListener("load", onLoad, { once: true });
        return () => {
            observer?.disconnect();
            themeObserver.disconnect();
            script?.removeEventListener("load", onLoad);
        };
    }, [clientId, text]);

    if (!clientId) {
        return <p className={cn("flex h-11 w-full items-center justify-center rounded-full border border-border bg-track text-sm font-semibold text-muted", className)}>Google sign-in isn’t set up here</p>;
    }
    return (
        <div className={cn("relative min-h-11 w-full", busy && "pointer-events-none opacity-60", className)}>
            {/* Holds the button's place and says what is coming. Not a control:
                the real one is Google's, drawn over it by the div below. */}
            {!drawn && <div aria-hidden className="absolute inset-0 flex h-11 items-center justify-center rounded-full border border-border bg-track text-sm font-semibold text-muted">Continue with Google…</div>}
            <div ref={ref} className="relative flex min-h-11 w-full justify-center [&>div]:!w-full [&_iframe]:!w-full" />
        </div>
    );
}
