import assert from "node:assert/strict";
import test from "node:test";
import { feedbackAttachmentLinks } from "./feedback-attachments";

test("attachments open through the admin route, by position", () => {
    assert.deepEqual(
        feedbackAttachmentLinks(12, ["https://api.finnri.app/uploads/aa.png", "https://api.finnri.app/uploads/bb.pdf"]),
        [
            { href: "/api/admin/feedback/12/attachments/0", isPdf: false, label: "Attachment 1" },
            { href: "/api/admin/feedback/12/attachments/1", isPdf: true, label: "Attachment 2" },
        ],
    );
});

test("feedback from before attachments existed has none", () => {
    assert.deepEqual(feedbackAttachmentLinks(3, null), []);
    assert.deepEqual(feedbackAttachmentLinks(3, undefined), []);
    assert.deepEqual(feedbackAttachmentLinks(3, []), []);
});
