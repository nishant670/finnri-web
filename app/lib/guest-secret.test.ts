import assert from "node:assert/strict";
import test from "node:test";
import { GUEST_SECRET_KEY, guestSecret } from "./guest-secret";

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
    };
}

test("a guest secret is 32 random bytes as hex", () => {
    const secret = guestSecret(memoryStorage(), crypto);
    assert.match(secret, /^[0-9a-f]{64}$/);
});

test("a guest secret is made once and then read back", () => {
    const storage = memoryStorage();
    let calls = 0;
    const random = { getRandomValues: <T extends ArrayBufferView | null>(array: T): T => { calls += 1; return crypto.getRandomValues(array as never) as T; } };
    const first = guestSecret(storage, random);
    assert.equal(guestSecret(storage, random), first);
    assert.equal(storage.getItem(GUEST_SECRET_KEY), first);
    assert.equal(calls, 1);
});

test("two browsers do not share a guest secret", () => {
    assert.notEqual(guestSecret(memoryStorage(), crypto), guestSecret(memoryStorage(), crypto));
});
