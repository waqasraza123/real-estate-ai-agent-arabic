import { describe, expect, it } from "vitest";

import type { CaseQaReviewStatus, PersistedCaseSummary } from "@real-estate-ai/contracts";

import { buildQaWorkspaceQueues, getQaWorkspaceCopy } from "./qa-workspace";

function buildCase(caseId: string, status: CaseQaReviewStatus, updatedAt: string) {
  return {
    automationHoldReason: status === "pending_review" ? "qa_pending_review" : status === "follow_up_required" ? "qa_follow_up_required" : null,
    automationStatus: "active",
    caseId,
    createdAt: "2026-04-10T08:00:00.000Z",
    currentHandoverCustomerUpdateQaReview: null,
    currentQaReview: {
      createdAt: updatedAt,
      draftMessage: null,
      policySignals: status === "pending_review" ? ["exception_request"] : [],
      qaReviewId: `${caseId}-qa`,
      requestedByName: "Revenue Ops",
      reviewSummary: status === "pending_review" ? null : "Reviewed",
      reviewedAt: status === "pending_review" ? null : updatedAt,
      reviewerName: status === "pending_review" ? null : "QA Reviewer",
      sampleSummary: "Customer escalation review",
      status,
      subjectType: "case_message",
      triggerEvidence: status === "pending_review" ? ["exception"] : [],
      triggerSource: status === "pending_review" ? "policy_rule" : "manual_request",
      updatedAt
    },
    customerName: caseId,
    followUpStatus: "on_track",
    handoverCase: null,
    handoverClosure: null,
    nextAction: "Review",
    nextActionDueAt: "2026-04-12T08:00:00.000Z",
    openInterventionsCount: 0,
    ownerName: "Revenue Ops",
    preferredLocale: "en",
    projectInterest: "Sunrise Residences",
    source: "website",
    stage: "new",
    updatedAt
  } satisfies PersistedCaseSummary;
}

describe("qa workspace", () => {
  it("sorts pending reviews ahead of resolved items", () => {
    const queues = buildQaWorkspaceQueues([
      buildCase("case-approved", "approved", "2026-04-12T09:00:00.000Z"),
      buildCase("case-pending", "pending_review", "2026-04-12T08:00:00.000Z"),
      buildCase("case-follow-up", "follow_up_required", "2026-04-12T10:00:00.000Z")
    ]);

    expect(queues.pendingCases.map((caseItem) => caseItem.caseId)).toEqual(["case-pending"]);
    expect(queues.followUpCases.map((caseItem) => caseItem.caseId)).toEqual(["case-follow-up"]);
    expect(queues.approvedCases.map((caseItem) => caseItem.caseId)).toEqual(["case-approved"]);
    expect(queues.qaCases.map((caseItem) => caseItem.caseId)).toEqual(["case-pending", "case-follow-up", "case-approved"]);
  });

  it("includes active handover draft reviews in the same queue", () => {
    const queues = buildQaWorkspaceQueues([
      buildCase("case-message", "approved", "2026-04-12T09:00:00.000Z"),
      {
        ...buildCase("case-draft", "approved", "2026-04-12T07:00:00.000Z"),
        currentHandoverCustomerUpdateQaReview: {
          customerUpdateId: "7f1f1111-1111-4111-8111-111111111111",
          deliverySummary: "We guarantee the keys by Friday.",
          handoverCaseId: "8f1f1111-1111-4111-8111-111111111111",
          policySignals: ["possession_date_promise"],
          reviewSampleSummary: "Prepared draft needs QA approval before dispatch.",
          reviewStatus: "pending_review",
          reviewSummary: null,
          reviewedAt: null,
          reviewerName: null,
          triggerEvidence: ["guarantee"],
          type: "appointment_confirmation",
          updatedAt: "2026-04-12T10:00:00.000Z"
        }
      }
    ]);

    expect(queues.pendingCases.map((caseItem) => caseItem.caseId)).toEqual(["case-draft"]);
    expect(queues.qaCases.map((caseItem) => caseItem.caseId)).toEqual(["case-draft", "case-message"]);
  });

  it("returns localized copy", () => {
    expect(getQaWorkspaceCopy("en").title).toBe("QA review center");
    expect(getQaWorkspaceCopy("ar").accessRequiredTitle).toBe("مساحة الجودة مطلوبة");
  });
});
