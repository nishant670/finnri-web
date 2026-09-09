/**
 * The picker list for a given value.
 *
 * An unrecognised category — one a user created deliberately, which the backend
 * stores verbatim — is appended so that editing that entry never silently
 * rewrites it. This mirrors `categoryOptionsFor` in `finnri-app/lib/categories.ts`.
 */
export function categoryOptionsFor(canonical: string[], current?: string | null): string[] {
    const value = current?.trim();
    if (!value) return canonical;
    const alreadyListed = canonical.some((category) => category.toLowerCase() === value.toLowerCase());
    return alreadyListed ? canonical : [...canonical, value];
}
