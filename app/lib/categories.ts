import { CategoriesAPI } from "@/app/lib/api";
export { categoryOptionsFor } from "@/app/lib/category-options";

/**
 * The category vocabulary, read from the API rather than declared here.
 *
 * This file deliberately contains no list. The backend's `canonicalCategories`
 * (`EZ-Money-BE/internal/http/categories.go`) is the single source of truth, and
 * it is served by `GET /v1/categories`.
 *
 * The reason is a bug this file exists to make impossible. The picker in
 * `AddTransactionModal` used to hardcode eight values that shared only five with
 * the canonical eight. `Electronics` and `Other` were silently rewritten to
 * `Shopping` and `Misc` by the backend's alias table, so the picker told the user
 * something the database disagreed with; `Health` matched no alias, so the
 * backend — correctly assuming an unrecognised name means the user meant it —
 * stored it verbatim as a custom category nobody had chosen to create. Meanwhile
 * `Travel`, `Family/Gifts` and `Misc` could not be picked from a browser at all.
 *
 * A cached copy is kept in `localStorage` so a transient network failure falls
 * back to the last list the server actually served, rather than to a constant
 * that can drift.
 */

const CACHE_KEY = "finnri_categories_v2";

export type CategorySet = {
  categories: string[];
  default: string;
  income_categories: string[];
  income_default: string;
};

type CachedCategorySet = CategorySet & { fetched_at: string };

let inFlight: Promise<CategorySet> | null = null;

function readCache(): CategorySet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCategorySet;
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) return null;
    if (typeof parsed.default !== "string" || !parsed.default) return null;
    if (!Array.isArray(parsed.income_categories) || parsed.income_categories.length === 0) return null;
    if (typeof parsed.income_default !== "string" || !parsed.income_default) return null;
    return {
      categories: parsed.categories,
      default: parsed.default,
      income_categories: parsed.income_categories,
      income_default: parsed.income_default,
    };
  } catch {
    window.localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(value: CategorySet) {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedCategorySet = { ...value, fetched_at: new Date().toISOString() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // A full or unavailable localStorage is not a reason to fail the fetch.
  }
}

/**
 * Fetches the category set, de-duplicating concurrent callers and falling back
 * to the last successful response when the request fails.
 *
 * Throws only when there is nothing cached to fall back to — a first-ever use
 * with no connectivity. Callers must treat that as "cannot save yet" rather than
 * substituting a list of their own.
 */
export async function loadCategories(): Promise<CategorySet> {
  if (inFlight) return inFlight;

  inFlight = CategoriesAPI.list()
    .then((response) => {
      const value: CategorySet = {
        categories: response.data.categories,
        default: response.data.default,
        income_categories: response.data.income_categories,
        income_default: response.data.income_default,
      };
      writeCache(value);
      return value;
    })
    .catch((error) => {
      const cached = readCache();
      if (cached) return cached;
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
