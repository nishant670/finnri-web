"use client";

import { useEffect, useRef } from "react";
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
            if (width === renderedWidth && ref.current.childElementCount > 0) return true;
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
    return <div ref={ref} className={cn("flex min-h-11 w-full justify-center [&>div]:!w-full [&_iframe]:!w-full", busy && "pointer-events-none opacity-60", className)} />;
}
