import { describe, expect, it } from "vitest";

import type { CaseQaReviewStatus, HandoverCustomerUpdateQaReviewStatus, PersistedCaseSummary } from "@real-estate-ai/contracts";

import { buildGovernanceOperationalRiskSummary, buildManagerGovernanceSummary } from "./governance-workspace";

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
    latestHumanReply: null,
    latestManagerFollowUp: null,
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

  it("derives escalated reply handoff pressure by current owner", () => {
    const summary = buildGovernanceOperationalRiskSummary([
      {
        ...buildRevenueQaCase("handoff-owner-1", "approved", "2026-04-13T11:00:00.000Z", "manual_request"),
        followUpStatus: "attention",
        latestHumanReply: {
          approvedFromQa: false,
          message: "Sent the reservation answer.",
          nextAction: "Wait for manager callback",
          nextActionDueAt: "2026-04-13T12:00:00.000Z",
          sentAt: "2026-04-13T11:00:00.000Z",
          sentByName: "Amina Rahman"
        },
        latestManagerFollowUp: {
          bulkAction: {
            batchId: "33333333-3333-4333-8333-333333333333",
            caseCount: 3,
            scopedOwnerName: "Revenue Ops Queue"
          },
          nextAction: "Reset the desk follow-up",
          nextActionDueAt: "2026-04-13T12:30:00.000Z",
          ownerName: "Manager Desk North",
          savedAt: "2026-04-13T11:15:00.000Z"
        },
        openInterventionsCount: 1,
        ownerName: "Manager Desk North"
      },
      {
        ...buildRevenueQaCase("handoff-owner-2", "approved", "2026-04-13T10:00:00.000Z", "manual_request"),
        followUpStatus: "attention",
        latestHumanReply: {
          approvedFromQa: true,
          message: "Sent the approved reply.",
          nextAction: "Confirm document receipt",
          nextActionDueAt: "2026-04-13T13:00:00.000Z",
          sentAt: "2026-04-13T10:00:00.000Z",
          sentByName: "Omar Saleh"
        },
        latestManagerFollowUp: {
          bulkAction: {
            batchId: "33333333-3333-4333-8333-333333333333",
            caseCount: 3,
            scopedOwnerName: "Revenue Ops Queue"
          },
          nextAction: "Reset the desk follow-up",
          nextActionDueAt: "2026-04-13T12:30:00.000Z",
          ownerName: "Manager Desk North",
          savedAt: "2026-04-13T11:15:00.000Z"
        },
        openInterventionsCount: 0,
        ownerName: "Manager Desk North"
      },
      {
        ...buildRevenueQaCase("bulk-cleared", "approved", "2026-04-13T08:00:00.000Z", "manual_request"),
        followUpStatus: "on_track",
        latestHumanReply: {
          approvedFromQa: false,
          message: "Shared the corrected reply.",
          nextAction: "Hold until buyer confirms",
          nextActionDueAt: "2026-04-13T15:00:00.000Z",
          sentAt: "2026-04-13T08:00:00.000Z",
          sentByName: "Omar Saleh"
        },
        latestManagerFollowUp: {
          bulkAction: {
            batchId: "33333333-3333-4333-8333-333333333333",
            caseCount: 3,
            scopedOwnerName: "Revenue Ops Queue"
          },
          nextAction: "Reset the desk follow-up",
          nextActionDueAt: "2026-04-13T12:30:00.000Z",
          ownerName: "Manager Desk North",
          savedAt: "2026-04-13T11:15:00.000Z"
        },
        openInterventionsCount: 0,
        ownerName: "Manager Desk North"
      },
      {
        ...buildRevenueQaCase("sender-still-owner", "approved", "2026-04-13T09:00:00.000Z", "manual_request"),
        followUpStatus: "attention",
        latestHumanReply: {
          approvedFromQa: false,
          message: "Followed up directly.",
          nextAction: "Wait for customer",
          nextActionDueAt: "2026-04-13T14:00:00.000Z",
          sentAt: "2026-04-13T09:00:00.000Z",
          sentByName: "Revenue Ops"
        },
        ownerName: "Revenue Ops"
      }
    ]);

    expect(summary.totalEscalatedReplyHandoffCount).toBe(2);
    expect(summary.batchesWithDriftCount).toBe(0);
    expect(summary.driftedCaseCount).toBe(0);
    expect(summary.laterBulkResetCount).toBe(0);
    expect(summary.postBatchFollowUpUpdateCount).toBe(0);
    expect(summary.escalatedReplyHandoffCases.map((caseItem) => caseItem.caseId)).toEqual(["handoff-owner-1", "handoff-owner-2"]);
    expect(summary.exportCandidates).toEqual([
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 3,
        priority: "baseline",
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        score: 156,
        scope: "full_batch",
        stillEscalatedCaseCount: 2
      }
    ]);
    expect(summary.owners).toEqual([
      {
        escalatedHandoffCount: 2,
        latestSenderNames: ["Amina Rahman", "Omar Saleh"],
        openInterventionsCount: 1,
        overdueHandoffCount: 2,
        ownerName: "Manager Desk North"
      }
    ]);
    expect(summary.bulkBatches).toEqual([
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 3,
        clearedCaseCount: 1,
        currentOwnerNames: ["Manager Desk North"],
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        stillEscalatedCaseCount: 2
      }
    ]);
  });

  it("hydrates recent bulk batches with visible drift indicators when batch history is available", () => {
    const summary = buildGovernanceOperationalRiskSummary(
      [
        {
          ...buildRevenueQaCase("handoff-owner-1", "approved", "2026-04-13T11:00:00.000Z", "manual_request"),
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: false,
            message: "Sent the reservation answer.",
            nextAction: "Wait for manager callback",
            nextActionDueAt: "2026-04-13T12:00:00.000Z",
            sentAt: "2026-04-13T11:00:00.000Z",
            sentByName: "Amina Rahman"
          },
          latestManagerFollowUp: {
            bulkAction: {
              batchId: "33333333-3333-4333-8333-333333333333",
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-13T12:30:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-13T11:15:00.000Z"
          },
          openInterventionsCount: 1,
          ownerName: "Manager Desk North"
        },
        {
          ...buildRevenueQaCase("bulk-cleared", "approved", "2026-04-13T08:00:00.000Z", "manual_request"),
          followUpStatus: "on_track",
          latestHumanReply: {
            approvedFromQa: false,
            message: "Shared the corrected reply.",
            nextAction: "Hold until buyer confirms",
            nextActionDueAt: "2026-04-13T15:00:00.000Z",
            sentAt: "2026-04-13T08:00:00.000Z",
            sentByName: "Omar Saleh"
          },
          latestManagerFollowUp: {
            bulkAction: {
              batchId: "33333333-3333-4333-8333-333333333333",
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-13T12:30:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-13T11:15:00.000Z"
          },
          openInterventionsCount: 0,
          ownerName: "Manager Desk North"
        }
      ],
      {
        batchHistoryByBatchId: new Map([
          [
            "33333333-3333-4333-8333-333333333333",
            {
              casesWithHistoryCount: 2,
              casesWithLaterChangesCount: 1,
              historyCases: [
                {
                  caseId: "handoff-owner-1",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "handoff-owner-1",
                  entries: [
                    {
                      batchCaseCount: 3,
                      batchId: "33333333-3333-4333-8333-333333333333",
                      caseId: "handoff-owner-1",
                      createdAt: "2026-04-13T11:15:00.000Z",
                      currentOwnerName: "Manager Desk North",
                      currentRiskStatus: "still_escalated",
                      customerName: "handoff-owner-1",
                      nextAction: "Reset the desk follow-up",
                      nextActionDueAt: "2026-04-13T12:30:00.000Z",
                      ownerName: "Manager Desk North",
                      scopedOwnerName: "Revenue Ops Queue",
                      type: "scoped_batch_reset"
                    },
                    {
                      batchCaseCount: 2,
                      batchId: "66666666-6666-4666-8666-666666666666",
                      caseId: "handoff-owner-1",
                      createdAt: "2026-04-13T13:00:00.000Z",
                      currentOwnerName: "Manager Desk North",
                      currentRiskStatus: "still_escalated",
                      customerName: "handoff-owner-1",
                      nextAction: "Manager bulk retry",
                      nextActionDueAt: "2026-04-13T14:00:00.000Z",
                      ownerName: "Manager Desk North",
                      scopedOwnerName: "Manager Desk North",
                      type: "later_bulk_reset"
                    },
                    {
                      caseId: "handoff-owner-1",
                      createdAt: "2026-04-13T14:00:00.000Z",
                      currentOwnerName: "Manager Desk North",
                      currentRiskStatus: "still_escalated",
                      customerName: "handoff-owner-1",
                      nextAction: "Manual follow-up save",
                      nextActionDueAt: "2026-04-13T15:00:00.000Z",
                      ownerName: "Manager Desk North",
                      type: "follow_up_update"
                    }
                  ]
                },
                {
                  caseId: "bulk-cleared",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "cleared",
                  customerName: "bulk-cleared",
                  entries: [
                    {
                      batchCaseCount: 3,
                      batchId: "33333333-3333-4333-8333-333333333333",
                      caseId: "bulk-cleared",
                      createdAt: "2026-04-13T11:15:00.000Z",
                      currentOwnerName: "Manager Desk North",
                      currentRiskStatus: "cleared",
                      customerName: "bulk-cleared",
                      nextAction: "Reset the desk follow-up",
                      nextActionDueAt: "2026-04-13T12:30:00.000Z",
                      ownerName: "Manager Desk North",
                      scopedOwnerName: "Revenue Ops Queue",
                      type: "scoped_batch_reset"
                    }
                  ]
                }
              ],
              laterBulkResetCount: 1,
              postBatchFollowUpUpdateCount: 2
            }
          ]
        ])
      }
    );

    expect(summary.batchesWithDriftCount).toBe(1);
    expect(summary.driftedCaseCount).toBe(1);
    expect(summary.followUpUpdateOnlyDriftCaseCount).toBe(0);
    expect(summary.laterBulkResetCount).toBe(1);
    expect(summary.laterBulkResetOnlyDriftCaseCount).toBe(0);
    expect(summary.mixedReasonDriftCaseCount).toBe(1);
    expect(summary.postBatchFollowUpUpdateCount).toBe(2);
    expect(summary.bulkBatches).toEqual([
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 3,
        clearedCaseCount: 1,
        currentOwnerNames: ["Manager Desk North"],
        drift: {
          casesWithHistoryCount: 2,
          casesWithLaterChangesCount: 1,
          followUpUpdateOnlyCaseCount: 0,
          laterBulkResetCount: 1,
          laterBulkResetOnlyCaseCount: 0,
          mixedReasonCaseCount: 1,
          postBatchFollowUpUpdateCount: 2
        },
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        stillEscalatedCaseCount: 1
      }
    ]);
    expect(summary.exportCandidates).toEqual([
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 1,
        priority: "high",
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        score: 313,
        scope: "mixed",
        stillEscalatedCaseCount: 1
      },
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 1,
        priority: "medium",
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        score: 263,
        scope: "changed_later",
        stillEscalatedCaseCount: 1
      },
      {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 3,
        priority: "baseline",
        savedAt: "2026-04-13T11:15:00.000Z",
        scopedOwnerName: "Revenue Ops Queue",
        score: 153,
        scope: "full_batch",
        stillEscalatedCaseCount: 1
      }
    ]);
  });
});
