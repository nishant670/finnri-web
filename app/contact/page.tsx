import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";
import { BUSINESS_ADDRESS, LEGAL_BUSINESS_NAME, SUPPORT_PHONE } from "@/app/lib/site";

export const metadata: Metadata = {
    title: "Contact Finnri",
    description: "Contact Finnri for product, payment, privacy, and grievance support.",
};

export default function ContactPage() {
    return (
        <LegalPage title="Contact Finnri" effectiveDate="5 September 2026" intro={<p>Contact us about product access, payments, refunds, privacy requests, or account support. Please never email a PIN, OTP, card number, UPI PIN, or bank password.</p>}>
            <section><h2>Business details</h2><p><strong>Business name:</strong> {LEGAL_BUSINESS_NAME}</p><p className="mt-3"><strong>Business address:</strong> {BUSINESS_ADDRESS}</p><p className="mt-3"><strong>Support phone:</strong> <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a></p></section>
            <section><h2>Customer support</h2><p>Email <a href="mailto:support@finnri.app?subject=Finnri%20Support">support@finnri.app</a>. Include the Finnri account email and a concise description. For payment issues, include the Razorpay payment ID or order ID, amount, and date.</p><p className="mt-3">We aim to acknowledge support and grievance messages within 3 business days.</p></section>
            <section><h2>Refunds and privacy</h2><p>For payment cancellation or refund criteria, read the <a href="/refunds">Cancellation and Refund Policy</a>. For access, correction, deletion, or privacy complaints, use the same support email with the subject “Finnri Privacy”.</p></section>
        </LegalPage>
    );
}
