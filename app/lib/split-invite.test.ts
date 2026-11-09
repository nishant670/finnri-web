import assert from "node:assert/strict";
import test from "node:test";
import { androidInviteIntentURL, joinedGroupPath, playStoreInviteURL, readJoinedGroupID, withoutJoinedGroup } from "./split-invite";

test("a join lands on the Groups section carrying the group id", () => {
    assert.equal(joinedGroupPath(42), "/dashboard/splits?joined=42#groups");
});

test("a join without a usable group id still lands on Groups, not Balances", () => {
    for (const id of [null, undefined, 0, -3, 1.5, Number.NaN]) {
        assert.equal(joinedGroupPath(id), "/dashboard/splits#groups");
    }
});

test("the joined id round-trips through the landing URL", () => {
    const search = new URL(joinedGroupPath(42), "https://finnri.app").search;
    assert.equal(readJoinedGroupID(search), 42);
});

test("a missing or malformed joined param is no join", () => {
    for (const search of ["", "?", "?joined=", "?joined=abc", "?joined=0", "?joined=-1", "?joined=1.5", "?joined=1e3", "?other=5"]) {
        assert.equal(readJoinedGroupID(search), null, search);
    }
});

test("clearing the joined param keeps every other param", () => {
    assert.equal(withoutJoinedGroup("?joined=42"), "");
    assert.equal(withoutJoinedGroup("?a=1&joined=42&b=2"), "?a=1&b=2");
    assert.equal(withoutJoinedGroup(""), "");
});

const PLAY = "https://play.google.com/store/apps/details?id=com.finnri.app";
const TOKEN = "Ab3_dE-f9GhIjK0lMnOpQr";

test("the Play link carries the invite for the app's first run", () => {
    const url = new URL(playStoreInviteURL(PLAY, TOKEN));
    assert.equal(url.searchParams.get("id"), "com.finnri.app");
    assert.equal(url.searchParams.get("referrer"), `invite=${TOKEN}`);
});

test("the Android intent opens the app, or the Play Store with the invite", () => {
    const intent = androidInviteIntentURL(PLAY, TOKEN);
    assert.ok(intent);
    assert.ok(intent.startsWith(`intent://invite/split/${TOKEN}#Intent;scheme=finnri;package=com.finnri.app;`));
    const fallback = decodeURIComponent(/S\.browser_fallback_url=([^;]+);end$/.exec(intent)?.[1] ?? "");
    assert.equal(fallback, playStoreInviteURL(PLAY, TOKEN));
});

test("a Play link with no package gives no intent", () => {
    assert.equal(androidInviteIntentURL("https://play.google.com/store", TOKEN), null);
});
