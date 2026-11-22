/**
 * What a guest in this browser proves itself with.
 *
 * `finnri_web_device_id` used to be a guest's whole identity: the API handed a
 * session to whoever sent it, and stored it as it stands. It is still sent,
 * because guest credits are counted against it, but it no longer opens
 * anything by itself. This is 32 random bytes the API keeps only a hash of. A
 * guest made before this existed is claimed by the first secret that arrives
 * alongside its device id, so the two always travel together.
 */
export const GUEST_SECRET_KEY = "finnri_web_guest_secret";

type SecretStorage = Pick<Storage, "getItem" | "setItem">;
type RandomSource = Pick<Crypto, "getRandomValues">;

export function guestSecret(storage: SecretStorage = localStorage, random: RandomSource = crypto): string {
    const stored = storage.getItem(GUEST_SECRET_KEY);
    if (stored) return stored;
    const bytes = random.getRandomValues(new Uint8Array(32));
    const secret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    storage.setItem(GUEST_SECRET_KEY, secret);
    return secret;
}
