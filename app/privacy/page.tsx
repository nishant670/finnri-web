import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
    title: "Privacy Policy | Finnri",
    description: "How Finnri collects, uses, protects, and deletes personal and financial data.",
};

export default function PrivacyPolicyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            effectiveDate="12 September 2026"
            intro={<p>This policy explains what Finnri collects, why it is needed, when it is shared, and the choices available to you. It applies to Finnri&apos;s mobile app, web dashboard, and supporting services.</p>}
        >
            <section>
                <h2>1. Information we collect</h2>
                <ul>
                    <li><strong>Account information:</strong> username, email address or phone number, device identifier, sign-in method, and authentication-session records.</li>
                    <li><strong>Financial records you provide:</strong> transactions, account labels and balances, categories, tags, notes, budgets, subscriptions, split-ledger details, and uploaded attachments.</li>
                    <li><strong>AI capture inputs:</strong> text or voice you submit to create an editable transaction draft, together with technical usage totals needed to enforce trial credits and service limits.</li>
                    <li><strong>Support information:</strong> messages and details you choose to send when asking for help or providing feedback.</li>
                    <li><strong>Technical information:</strong> request timestamps, basic server logs, error information, and security events used to operate and protect the service.</li>
                </ul>
            </section>

            <section>
                <h2>2. How we use information</h2>
                <p>We use this information to authenticate you, store and display the records you confirm, calculate totals and deterministic insights, operate budgets and reminders, provide split-ledger features, process exports, answer support requests, prevent abuse, and maintain the security and reliability of Finnri.</p>
                <p className="mt-3">Finnri does not connect to your bank, request bank passwords, move money, or automatically import bank activity.</p>
                <p className="mt-3">When enabled, Finnri uses Plausible Analytics for aggregate marketing-page and signup-funnel counts. Finnri sends only fixed event names, allow-listed page paths, and coarse sign-in or capture-method labels—never an account identifier, merchant, amount, note, or financial record. Plausible does not set analytics cookies or build a persistent user profile.</p>
            </section>

            <section>
                <h2>3. Voice and AI processing</h2>
                <p>Voice audio is held in memory only long enough to transcribe it. A parse request returns a draft and does not persist the parse attempt, raw transcript, provider prompt, or raw provider response. If you confirm a transaction, its source text may be stored as editable provenance with that transaction.</p>
                <p className="mt-3">AI inputs are sent to an AI service provider solely to transcribe audio or create the draft you requested. AI suggestions can be wrong; Finnri waits for your review before saving a transaction.</p>
            </section>

            <section>
                <h2>4. When information is shared</h2>
                <p>We do not sell your personal or financial data. We share information only with service providers needed to operate Finnri—such as hosting, database, authentication, email or messaging, and AI-processing providers—or when required by law, necessary to protect users and the service, or connected with a business transfer subject to appropriate safeguards.</p>
                <p className="mt-3">Split records are private ledger entries in your account. Finnri does not notify or transfer money to a friend merely because you add them to a split.</p>
            </section>

            <section>
                <h2>5. Storage and security</h2>
                <p>Production connections and stored records are encrypted in transit and at rest. Finnri also uses authenticated, user-owned API routes and expiring sessions to restrict access. No system is perfectly secure, so please use a strong device lock and do not share your sign-in codes or PIN.</p>
                <p className="mt-3">The web dashboard stores its session token and basic user profile in browser local storage so you remain signed in. It does not currently use third-party advertising cookies.</p>
            </section>

            <section>
                <h2>6. Retention and deletion</h2>
                <p>We retain account and financial records while your account is active so Finnri can provide the service. You can edit or delete individual transactions. Deleting your Finnri account permanently removes the authenticated profile and its owned entries, accounts, budgets, subscriptions, split-ledger records, quick prompts, notifications, and active authentication sessions from the service.</p>
                <p className="mt-3">Account deletion is available in the mobile app under Security &amp; Privacy. If you no longer have the app, use the <a href="/delete-account">public account-deletion request page</a>.</p>
            </section>

            <section>
                <h2>7. Your choices and rights</h2>
                <p>You may update your profile and records, export transaction views as CSV, withdraw from optional AI capture by using manual entry, sign out, or delete your account. Depending on applicable law, you may also request access, correction, erasure, or grievance handling for your personal data.</p>
                <p className="mt-3">India&apos;s data-protection framework and its phased commencement are published by the <a href="https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025" target="_blank" rel="noreferrer">Ministry of Electronics and Information Technology</a>.</p>
            </section>

            <section>
                <h2>8. Children</h2>
                <p>Finnri is not designed for children under 18. If you believe a child has provided personal data without appropriate authorisation, contact us so we can review and delete it.</p>
            </section>

            <section>
                <h2>9. Changes and contact</h2>
                <p>We may update this policy when the product or applicable requirements change. The effective date above will be updated, and material changes will be communicated through an appropriate product notice.</p>
                <p className="mt-3">For privacy questions, requests, or complaints, email <a href="mailto:support@finnri.app?subject=Finnri%20Privacy">support@finnri.app</a>.</p>
            </section>
        </LegalPage>
    );
}
