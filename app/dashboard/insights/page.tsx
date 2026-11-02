import { redirect } from "next/navigation";

/**
 * Insights moved into Overview ("Needs attention") and Reports (comparisons).
 * Old links and bookmarks land on Overview.
 */
export default function InsightsMoved() {
    redirect("/dashboard#attention");
}
