/**
 * Where a web invite lands after the join succeeds.
 *
 * The Splits page opens on Balances, which for someone who joined a group a
 * second ago reads "No balances yet" — the join looks like it did nothing. The
 * group id rides along in the query so the page can name the group in a
 * confirmation and scroll to Groups, then drop the param so a refresh does not
 * announce the same join twice.
 */
export const JOINED_GROUP_PARAM = "joined";

const SPLITS_PATH = "/dashboard/splits";

export function joinedGroupPath(groupID: number | null | undefined): string {
    if (!isGroupID(groupID)) return `${SPLITS_PATH}#groups`;
    return `${SPLITS_PATH}?${JOINED_GROUP_PARAM}=${groupID}#groups`;
}

/** Reads the joined group id from a `location.search` string; anything malformed is no join. */
export function readJoinedGroupID(search: string): number | null {
    const raw = new URLSearchParams(search).get(JOINED_GROUP_PARAM);
    if (!raw || !/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return isGroupID(id) ? id : null;
}

/** The search string with the joined param removed, keeping any others. Empty, or starting with `?`. */
export function withoutJoinedGroup(search: string): string {
    const params = new URLSearchParams(search);
    params.delete(JOINED_GROUP_PARAM);
    const rest = params.toString();
    return rest ? `?${rest}` : "";
}

function isGroupID(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * The Play Store link for someone installing Finnri from a group invite.
 *
 * Google Play keeps the `referrer` parameter and gives it to the app on its
 * first run, so the app can open this invite rather than a generic welcome
 * (finnri-app `lib/install-referrer-invite.ts` reads `invite=<token>`).
 */
export function playStoreInviteURL(playStoreURL: string, token: string): string {
    const url = new URL(playStoreURL);
    url.searchParams.set("referrer", `invite=${token}`);
    return url.toString();
}

/**
 * An Android intent link to the invite: Chrome opens the app when it is
 * installed, and otherwise goes to the Play Store carrying the invite.
 *
 * `finnri://` alone does nothing at all on a phone without the app, which is
 * everyone this page is for: App Links already send people who have the app
 * straight into it. Returns null when the Play link names no package.
 */
export function androidInviteIntentURL(playStoreURL: string, token: string): string | null {
    const pkg = new URL(playStoreURL).searchParams.get("id");
    if (!pkg || !/^[A-Za-z0-9_.]+$/.test(pkg)) return null;
    const fallback = encodeURIComponent(playStoreInviteURL(playStoreURL, token));
    return `intent://invite/split/${encodeURIComponent(token)}#Intent;scheme=finnri;package=${pkg};S.browser_fallback_url=${fallback};end`;
}
