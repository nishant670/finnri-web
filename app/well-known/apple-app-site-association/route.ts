import { NextResponse } from "next/server";

/**
 * iOS Universal Links verification. The public, extensionless well-known URL
 * is rewritten here by next.config.ts because App Router cannot own a segment
 * beginning with a dot.
 *
 * Team IDs come from Apple Developer membership, not from the bundle ID. A
 * placeholder AASA is actively harmful because iOS caches failed association,
 * so the route stays uncacheable/404 until a valid value is configured.
 */

const BUNDLE_ID = "com.finnri.app";
const TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;

function configuredAppIDs() {
    return [...new Set(
        (process.env.APPLE_TEAM_IDS ?? "")
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter((value) => TEAM_ID_PATTERN.test(value))
            .map((teamID) => `${teamID}.${BUNDLE_ID}`),
    )];
}

export function GET() {
    const appIDs = configuredAppIDs();
    if (!appIDs.length) {
        return NextResponse.json(
            {
                error: "ios_universal_links_not_configured",
                detail: "Set APPLE_TEAM_IDS to the Team ID from the Apple Developer account.",
            },
            { status: 404, headers: { "Cache-Control": "no-store" } },
        );
    }

    return NextResponse.json(
        {
            applinks: {
                apps: [],
                details: appIDs.map((appID) => ({
                    appID,
                    paths: ["/invite/*"],
                })),
            },
        },
        {
            headers: {
                "Cache-Control": "public, max-age=3600",
                "Content-Type": "application/json",
            },
        },
    );
}
