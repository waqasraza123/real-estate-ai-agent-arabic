import { describe, expect, it } from "vitest";

import type { CaseQaReviewStatus, HandoverCustomerUpdateQaReviewStatus, PersistedCaseSummary } from "@real-estate-ai/contracts";

import { buildManagerGovernanceSummary } from "./governance-workspace";

function buildRevenueQaCase(caseId: string, status: CaseQaReviewStatus, updatedAt: string, triggerSource: "manual_request" | "policy_rule") {
  return {
    automationHoldReason: status === "pending_review" ? "qa_pending_review" : status === "follow_up_required" ? "qa_follow_up_required" : null,
    automationStatus: "active",
    caseId,
    createdAt: "2026-04-10T08:00:00.000Z",
    currentHandoverCustomerUpdateQaReview: null,
    currentQaReview:
      status === "approved"
        ? {
            createdAt: updatedAt,
            draftMessage: null,
            policySignals: [],
            qaReviewId: `${caseId}-qa`,
            requestedByName: "Revenue Ops",
            reviewSummary: "Approved",
            reviewedAt: updatedAt,
            reviewerName: "QA Reviewer",
            sampleSummary: "Revenue conversation review",
            status,
            subjectType: "case_message",
            triggerEvidence: [],
            triggerSource,
            updatedAt
          }
        : {
            createdAt: updatedAt,
            draftMessage: null,
            policySignals: status === "pending_review" ? ["exception_request"] : ["discrimination_risk"],
            qaReviewId: `${caseId}-qa`,
            requestedByName: "Revenue Ops",
            reviewSummary: status === "follow_up_required" ? "Escalate to manager" : null,
            reviewedAt: status === "follow_up_required" ? updatedAt : null,
            reviewerName: status === "follow_up_required" ? "QA Reviewer" : null,
            sampleSummary: "Revenue conversation review",
            status,
            subjectType: "case_message",
            triggerEvidence: ["policy trigger"],
            triggerSource,
            updatedAt
          },
    customerName: caseId,
    followUpStatus: "on_track",
    handoverCase: null,
    handoverClosure: null,
    nextAction: "Review governance hold",
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

function buildHandoverQaCase(caseId: string, status: HandoverCustomerUpdateQaReviewStatus, updatedAt: string) {
  return {
    ...buildRevenueQaCase(caseId, "approved", updatedAt, "manual_request"),
    currentHandoverCustomerUpdateQaReview:
      status === "not_required"
        ? null
        : {
            customerUpdateId: `update-${caseId}`,
            deliverySummary: "We guarantee the handover this Friday.",
            handoverCaseId: `handover-${caseId}`,
            policySignals: status === "pending_review" ? ["possession_date_promise"] : ["legal_claim_risk"],
            reviewSampleSummary: "Prepared draft requires QA approval before dispatch.",
            reviewStatus: status,
            reviewSummary: status === "follow_up_required" ? "Remove the guarantee language." : null,
            reviewedAt: status === "follow_up_required" ? updatedAt : null,
            reviewerName: status === "follow_up_required" ? "QA Reviewer" : null,
            triggerEvidence: ["guarantee"],
            type: "appointment_confirmation",
            updatedAt
          }
  } satisfies PersistedCaseSummary;
}

describe("manager governance summary", () => {
  it("derives cross-surface governance counts and policy hotspots", () => {
    const summary = buildManagerGovernanceSummary(
      [
        buildRevenueQaCase("revenue-pending", "pending_review", "2026-04-12T09:00:00.000Z", "policy_rule"),
        buildRevenueQaCase("revenue-follow-up", "follow_up_required", "2026-04-13T09:00:00.000Z", "manual_request"),
        buildHandoverQaCase("handover-pending", "pending_review", "2026-04-11T08:00:00.000Z"),
        buildRevenueQaCase("revenue-approved", "approved", "2026-04-13T07:00:00.000Z", "manual_request")
      ],
      {
        now: new Date("2026-04-13T12:00:00.000Z")
      }
    );

    expect(summary.totalAttentionCasesCount).toBe(3);
    expect(summary.uniqueAttentionCaseCount).toBe(3);
    expect(summary.pendingCasesCount).toBe(2);
    expect(summary.followUpRequiredCasesCount).toBe(1);
    expect(summary.policyTriggeredCasesCount).toBe(2);
    expect(summary.manualRequestCasesCount).toBe(1);
    expect(summary.stalePendingCasesCount).toBe(2);
    expect(summary.topPolicySignals).toEqual([
      { count: 1, kind: "case_message", signal: "discrimination_risk" },
      { count: 1, kind: "case_message", signal: "exception_request" },
      { count: 1, kind: "handover_customer_update", signal: "possession_date_promise" }
    ]);
  });

  it("sorts queue items with pending cases ahead of follow-up items", () => {
    const summary = buildManagerGovernanceSummary([
      buildRevenueQaCase("revenue-follow-up", "follow_up_required", "2026-04-13T11:00:00.000Z", "manual_request"),
      buildRevenueQaCase("revenue-pending-late", "pending_review", "2026-04-13T10:00:00.000Z", "policy_rule"),
      buildRevenueQaCase("revenue-pending-early", "pending_review", "2026-04-13T08:00:00.000Z", "policy_rule"),
      buildHandoverQaCase("handover-follow-up", "follow_up_required", "2026-04-13T11:30:00.000Z"),
      buildHandoverQaCase("handover-pending", "pending_review", "2026-04-13T09:30:00.000Z")
    ]);

    expect(summary.revenueAttentionCases.map((caseItem) => caseItem.caseId)).toEqual([
      "revenue-pending-late",
      "revenue-pending-early",
      "revenue-follow-up"
    ]);
    expect(summary.handoverAttentionCases.map((caseItem) => caseItem.caseId)).toEqual([
      "handover-pending",
      "handover-follow-up"
    ]);
  });
});
