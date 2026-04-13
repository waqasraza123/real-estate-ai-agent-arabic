import { describe, expect, it } from "vitest";

import type { PersistedCaseSummary } from "@real-estate-ai/contracts";

import { buildManagerWorkspaceQueues, getDefaultManagerPath, getManagerWorkspaceFallbackAction, getManagerWorkspacePath } from "./manager-workspace";

function buildCase(caseId: string, overrides?: Partial<PersistedCaseSummary>) {
  return {
    automationHoldReason: null,
    automationStatus: "active",
    caseId,
    createdAt: "2026-04-10T08:00:00.000Z",
    currentHandoverCustomerUpdateQaReview: null,
    currentQaReview: null,
    customerName: `Customer ${caseId}`,
    followUpStatus: "on_track",
    handoverCase: null,
    handoverClosure: null,
    nextAction: "Next follow-up",
    nextActionDueAt: "2026-04-12T08:00:00.000Z",
    openInterventionsCount: 0,
    ownerName: "Revenue Ops",
    preferredLocale: "en",
    projectInterest: "Sunrise Residences",
    source: "website",
    stage: "new",
    updatedAt: "2026-04-11T08:00:00.000Z",
    ...overrides
  } satisfies PersistedCaseSummary;
}

describe("manager workspace routing", () => {
  it("uses dedicated manager routes for single-surface roles", () => {
    expect(getDefaultManagerPath("en", "sales_manager")).toBe("/en/manager/revenue");
    expect(getDefaultManagerPath("en", "handover_manager")).toBe("/en/manager/handover");
  });

  it("keeps the manager gateway for roles that can access both surfaces", () => {
    expect(getDefaultManagerPath("en", "admin")).toBe("/en/manager");
  });

  it("falls back to the dashboard when a role has no manager workspace", () => {
    expect(getDefaultManagerPath("en", "handover_coordinator")).toBe("/en/dashboard");
  });

  it("returns localized fallback actions for denied manager routes", () => {
    expect(getManagerWorkspaceFallbackAction("en", "handover_manager")).toEqual({
      href: "/en/manager/handover",
      label: "Open handover command center"
    });
    expect(getManagerWorkspaceFallbackAction("ar", "sales_manager")).toEqual({
      href: "/ar/manager/revenue",
      label: "فتح قيادة الإيرادات"
    });
  });

  it("builds stable manager workspace paths", () => {
    expect(getManagerWorkspacePath("en", "manager_revenue")).toBe("/en/manager/revenue");
    expect(getManagerWorkspacePath("ar", "manager_handover")).toBe("/ar/manager/handover");
  });

  it("separates QA-held automation from manually paused automation", () => {
    const queues = buildManagerWorkspaceQueues([
      buildCase("qa-held", {
        automationHoldReason: "qa_pending_review",
        currentQaReview: {
          createdAt: "2026-04-11T08:00:00.000Z",
          draftMessage: null,
          policySignals: ["exception_request"],
          qaReviewId: "qa-held-review",
          requestedByName: "Revenue Ops",
          reviewSummary: null,
          reviewedAt: null,
          reviewerName: null,
          sampleSummary: "Customer escalation review",
          status: "pending_review",
          subjectType: "case_message",
          triggerEvidence: ["exception"],
          triggerSource: "manual_request",
          updatedAt: "2026-04-11T08:00:00.000Z"
        }
      }),
      buildCase("paused", {
        automationStatus: "paused"
      }),
      buildCase("dual-held", {
        automationHoldReason: "qa_follow_up_required",
        automationStatus: "paused",
        currentQaReview: {
          createdAt: "2026-04-11T09:00:00.000Z",
          draftMessage: null,
          policySignals: ["legal_escalation_risk"],
          qaReviewId: "dual-held-review",
          requestedByName: "QA Desk",
          reviewSummary: "Keep human ownership on the next reply.",
          reviewedAt: "2026-04-11T10:00:00.000Z",
          reviewerName: "QA Reviewer",
          sampleSummary: "Customer escalation review",
          status: "follow_up_required",
          subjectType: "case_message",
          triggerEvidence: ["lawyer"],
          triggerSource: "policy_rule",
          updatedAt: "2026-04-11T10:00:00.000Z"
        }
      })
    ]);

    expect(queues.governanceHeldAutomationCases.map((caseItem) => caseItem.caseId)).toEqual(["qa-held", "dual-held"]);
    expect(queues.pausedAutomationCases.map((caseItem) => caseItem.caseId)).toEqual(["paused", "dual-held"]);
  });
});
