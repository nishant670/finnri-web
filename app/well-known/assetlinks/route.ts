import { NextResponse } from "next/server";

/**
 * Android App Links verification — served at `/.well-known/assetlinks.json`
 * through a rewrite in `next.config.ts`, because the App Router does not route
 * a directory whose name begins with a dot.
 *
 * Android fetches this once at install time to decide whether
 * `https://finnri.app/invite/split/…` may open the Finnri app instead of the
 * browser. It is public by design: a signing certificate's SHA-256 fingerprint
 * is not a secret, and Google publishes it in the Play Console.
 *
 * **Why this is a route and not a static file.** The fingerprint does not exist
 * until an app has been signed, and a file committed with a placeholder is
 * worse than no file at all: Android treats a well-formed statement whose
 * fingerprint does not match as a *failed* verification, caches that result,
 * and stops offering to open the app. Answering 404 until the value is
 * configured leaves verification simply not-yet-enabled, which is recoverable.
 *
 * **To turn it on**, set `ANDROID_CERT_SHA256_FINGERPRINTS` in the deploy
 * environment to the colon-separated SHA-256 from
 * *Play Console → Release → Setup → App signing*. List both the **app signing**
 * certificate and the **upload** certificate, comma separated, so internal-test
 * builds installed from an APK verify too:
 *
 *     ANDROID_CERT_SHA256_FINGERPRINTS=AB:CD:…:EF,12:34:…:56
 *
 * Then confirm with:
 *
 *     curl https://finnri.app/.well-known/assetlinks.json
 *     adb shell pm verify-app-links --re-verify com.finnri.app
 */

const PACKAGE_NAME = "com.finnri.app";

// Play Console renders the fingerprint as 32 uppercase hex pairs joined by
// colons. Rejecting anything else stops a truncated or lowercase paste from
// being published as a statement Android will read once and then distrust.
const FINGERPRINT_PATTERN = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

function configuredFingerprints(): string[] {
    return (process.env.ANDROID_CERT_SHA256_FINGERPRINTS ?? "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => FINGERPRINT_PATTERN.test(value));
}

export function GET() {
    const fingerprints = configuredFingerprints();

    if (!fingerprints.length) {
        return NextResponse.json(
            {
                error: "android_app_links_not_configured",
                detail: "Set ANDROID_CERT_SHA256_FINGERPRINTS to the app-signing SHA-256 from the Play Console.",
            },
            { status: 404, headers: { "Cache-Control": "no-store" } },
        );
    }

    return NextResponse.json(
        [
            {
                relation: ["delegate_permission/common.handle_all_urls"],
                target: {
                    namespace: "android_app",
                    package_name: PACKAGE_NAME,
                    sha256_cert_fingerprints: fingerprints,
                },
            },
        ],
        {
            headers: {
                // Android re-checks periodically; an hour is short enough that
                // adding the upload certificate later takes effect quickly, and
                // long enough not to matter.
                "Cache-Control": "public, max-age=3600",
                "Content-Type": "application/json",
            },
        },
    );
}
