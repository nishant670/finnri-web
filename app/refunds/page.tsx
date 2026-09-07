import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
    title: "Cancellation and Refund Policy | Finnri",
    description: "How to cancel a Finnri checkout, request a refund, and track refund processing.",
};

export default function RefundPolicyPage() {
    return (
        <LegalPage title="Cancellation and Refund Policy" effectiveDate="5 September 2026" intro={<p>This policy applies to paid Finnri passes purchased through the website. Contact <a href="mailto:support@finnri.app?subject=Finnri%20refund%20request">support@finnri.app</a> with your payment ID and account email when requesting help.</p>}>
            <section><h2>1. Cancelling before payment</h2><p>You may cancel checkout without charge by closing the Razorpay payment window before completing payment. Finnri passes are one-time purchases and do not renew automatically, so there is no recurring mandate to cancel.</p></section>
            <section><h2>2. Refund eligibility</h2><p>Ask us to review a payment within 7 calendar days if you were charged more than once, charged the wrong amount, did not receive the paid entitlement, could not use the purchased service because of a material Finnri failure, or believe the payment was unauthorised. For an accidental plan purchase, contact us as soon as possible and before substantially using its credits or paid features.</p><p className="mt-3">Credits or paid access already substantially consumed are generally not refundable, except where required by law or where Finnri failed to provide the purchased service. This does not limit mandatory consumer rights.</p></section>
            <section><h2>3. How requests are reviewed</h2><p>Include the Razorpay payment ID, purchase date, amount, Finnri account email, reason, and any supporting screenshot. We may verify account ownership and usage before deciding the request. We aim to respond within 3 business days.</p></section>
            <section><h2>4. Approved refunds</h2><p>Approved refunds are returned to the original payment method. Finnri will initiate an approved refund within 5 business days. Banks and payment networks commonly take a further 5–10 working days to show it; the exact timing is controlled by the payment provider and your bank.</p></section>
            <section><h2>5. Failed or pending payments</h2><p>If money is debited but Finnri shows no successful payment, do not pay again immediately. Send the payment or bank reference to support. Failed payments may be reversed automatically by the bank; a captured payment that did not activate access will be corrected or refunded after verification.</p></section>
        </LegalPage>
    );
}
