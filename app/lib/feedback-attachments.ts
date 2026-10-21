export type FeedbackAttachmentLink = { href: string; isPdf: boolean; label: string };

/**
 * Where an admin opens each file a user attached to feedback.
 *
 * The stored values are the user's upload URLs, which only open with a
 * signature tied to that user's own session. Admins go through the API's
 * admin route instead — by position, through this app's admin proxy, which
 * adds the admin session — so an <img> here can load them without either side
 * handing out a credential.
 */
export function feedbackAttachmentLinks(feedbackId: number, attachments?: string[] | null): FeedbackAttachmentLink[] {
    return (attachments ?? []).map((value, index) => ({
        href: `/api/admin/feedback/${feedbackId}/attachments/${index}`,
        isPdf: value.split("?")[0].toLowerCase().endsWith(".pdf"),
        label: `Attachment ${index + 1}`,
    }));
}
