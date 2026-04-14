import { describe, expect, it } from "vitest";

import type { PersistedCaseDetail, PersistedCaseSummary } from "@real-estate-ai/contracts";

import {
  buildRevenueManagerBatchDriftReasonMixSummary,
  buildRevenueManagerBatchDriftReasonSummaries,
  buildRevenueManagerBatchHistory,
  buildRevenueManagerDriftedCaseIdsByReason,
  buildRevenueManagerDriftedCaseIds,
  buildRevenueManagerBatchExportCsv,
  buildRevenueManagerExportHref,
  buildRevenueManagerHref,
  buildRevenueManagerScope,
  parseRevenueManagerFilters
} from "./revenue-manager";

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
    latestHumanReply: null,
    latestManagerFollowUp: null,
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

function buildCaseDetail(caseSummary: PersistedCaseSummary, overrides?: Partial<PersistedCaseDetail>) {
  return {
    ...caseSummary,
    auditEvents: [],
    budget: null,
    currentVisit: null,
    documentRequests: [],
    email: `${caseSummary.caseId}@example.com`,
    managerInterventions: [],
    message: `Message for ${caseSummary.caseId}`,
    phone: null,
    qaReviews: [],
    qualificationSnapshot: null,
    ...overrides
  } satisfies PersistedCaseDetail;
}

describe("revenue manager filters", () => {
  it("parses defaults from empty search params", () => {
    expect(parseRevenueManagerFilters(undefined)).toEqual({
      ownerName: undefined,
      queue: "all"
    });
  });

  it("keeps the first value when repeated params are present", () => {
    expect(
      parseRevenueManagerFilters({
        batchDriftReason: ["mixed"],
        batchDrift: ["changed_later"],
        bulkBatchId: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
        ownerName: [" Manager Desk North ", "Revenue Ops"],
        queue: ["escalated_handoffs", "all"]
      })
    ).toEqual({
      batchDrift: "changed_later",
      batchDriftReason: "mixed",
      bulkBatchId: "33333333-3333-4333-8333-333333333333",
      ownerName: "Manager Desk North",
      queue: "escalated_handoffs"
    });
  });

  it("builds stable revenue manager drill-down links", () => {
    expect(buildRevenueManagerHref("en")).toBe("/en/manager/revenue");
    expect(buildRevenueManagerExportHref("en")).toBe("/en/manager/revenue/export");
    expect(
      buildRevenueManagerHref(
        "en",
        {
          batchDrift: "changed_later",
          batchDriftReason: "follow_up_only",
          bulkBatchId: "33333333-3333-4333-8333-333333333333",
          ownerName: "Manager Desk North",
          queue: "escalated_handoffs"
        },
        { hash: "revenue-focused-queue" }
      )
    ).toBe(
      "/en/manager/revenue?queue=escalated_handoffs&ownerName=Manager+Desk+North&bulkBatchId=33333333-3333-4333-8333-333333333333&batchDrift=changed_later&batchDriftReason=follow_up_only#revenue-focused-queue"
    );
    expect(
      buildRevenueManagerExportHref("en", {
        batchDrift: "changed_later",
        batchDriftReason: "mixed",
        bulkBatchId: "33333333-3333-4333-8333-333333333333",
        queue: "escalated_handoffs"
      })
    ).toBe(
      "/en/manager/revenue/export?queue=escalated_handoffs&bulkBatchId=33333333-3333-4333-8333-333333333333&batchDrift=changed_later&batchDriftReason=mixed"
    );
  });

  it("scopes operational-risk drill-downs to the selected owner and queue", () => {
    const scope = buildRevenueManagerScope(
      [
        buildCase("owner-escalated", {
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: true,
            message: "Shared the approved update.",
            nextAction: "Confirm the next call",
            nextActionDueAt: "2026-04-12T09:00:00.000Z",
            sentAt: "2026-04-11T10:00:00.000Z",
            sentByName: "Amina Rahman"
          },
          ownerName: "Manager Desk North"
        }),
        buildCase("owner-aligned", {
          followUpStatus: "attention",
          ownerName: "Manager Desk North"
        }),
        buildCase("other-owner-escalated", {
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: false,
            message: "Shared a manual follow-up.",
            nextAction: "Wait for callback",
            nextActionDueAt: "2026-04-12T10:00:00.000Z",
            sentAt: "2026-04-11T11:00:00.000Z",
            sentByName: "Omar Saleh"
          },
          ownerName: "Manager Desk South"
        })
      ],
      {
        ownerName: "Manager Desk North",
        queue: "escalated_handoffs"
      }
    );

    expect(scope.ownerScopedCases.map((caseItem) => caseItem.caseId)).toEqual(["owner-escalated", "owner-aligned"]);
    expect(scope.focusedCases.map((caseItem) => caseItem.caseId)).toEqual(["owner-escalated"]);
  });

  it("prioritizes exact bulk batch scope over queue filtering", () => {
    const batchId = "33333333-3333-4333-8333-333333333333";
    const scope = buildRevenueManagerScope(
      [
        buildCase("batch-escalated", {
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: true,
            message: "Sent the approved update.",
            nextAction: "Confirm callback timing",
            nextActionDueAt: "2026-04-12T09:00:00.000Z",
            sentAt: "2026-04-11T10:00:00.000Z",
            sentByName: "Amina Rahman"
          },
          latestManagerFollowUp: {
            bulkAction: {
              batchId,
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-12T11:00:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-11T11:30:00.000Z"
          },
          openInterventionsCount: 1,
          ownerName: "Manager Desk North"
        }),
        buildCase("batch-cleared", {
          followUpStatus: "on_track",
          latestHumanReply: {
            approvedFromQa: false,
            message: "Sent the manual correction.",
            nextAction: "Wait for reply",
            nextActionDueAt: "2026-04-12T08:30:00.000Z",
            sentAt: "2026-04-11T09:30:00.000Z",
            sentByName: "Omar Saleh"
          },
          latestManagerFollowUp: {
            bulkAction: {
              batchId,
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-12T11:00:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-11T11:30:00.000Z"
          },
          ownerName: "Manager Desk South"
        }),
        buildCase("other-escalated", {
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: false,
            message: "Sent a manual update.",
            nextAction: "Wait for callback",
            nextActionDueAt: "2026-04-12T10:00:00.000Z",
            sentAt: "2026-04-11T11:00:00.000Z",
            sentByName: "Omar Saleh"
          },
          ownerName: "Manager Desk South"
        })
      ],
      {
        bulkBatchId: batchId,
        queue: "escalated_handoffs"
      }
    );

    expect(scope.focusedCases.map((caseItem) => caseItem.caseId)).toEqual(["batch-escalated", "batch-cleared"]);
    expect(scope.batchScope).toEqual({
      batchId,
      caseCount: 3,
      clearedCaseCount: 1,
      currentOwnerNames: ["Manager Desk North", "Manager Desk South"],
      savedAt: "2026-04-11T11:30:00.000Z",
      scopedOwnerName: "Revenue Ops Queue",
      stillEscalatedCaseCount: 1
    });
    expect(scope.batchOwnerGroups).toEqual([
      {
        cases: [scope.focusedCases[0]],
        caseCount: 1,
        clearedCaseCount: 0,
        ownerName: "Manager Desk North",
        stillEscalatedCaseCount: 1
      },
      {
        cases: [scope.focusedCases[1]],
        caseCount: 1,
        clearedCaseCount: 1,
        ownerName: "Manager Desk South",
        stillEscalatedCaseCount: 0
      }
    ]);

    expect(buildRevenueManagerBatchExportCsv(scope)).toBe(`batchId,batchSavedAt,batchScopedOwnerName,batchVisibleCaseCount,batchStillEscalatedCaseCount,batchClearedCaseCount,currentOwnerName,currentOwnerGroupCaseCount,currentOwnerGroupStillEscalatedCaseCount,currentOwnerGroupClearedCaseCount,riskStatus,customerName,caseReference,caseId,projectInterest,preferredLocale,nextAction,nextActionDueAt,followUpStatus,openInterventionsCount,latestHumanReplySentBy,latestHumanReplySentAt,latestHumanReplyApprovedFromQa,latestManagerFollowUpSavedAt,latestManagerFollowUpOwnerName,latestManagerFollowUpNextAction
33333333-3333-4333-8333-333333333333,2026-04-11T11:30:00.000Z,Revenue Ops Queue,2,1,1,Manager Desk North,1,1,0,still_escalated,Customer batch-escalated,CASE-BATCH-ES,batch-escalated,Sunrise Residences,en,Next follow-up,2026-04-12T08:00:00.000Z,attention,1,Amina Rahman,2026-04-11T10:00:00.000Z,true,2026-04-11T11:30:00.000Z,Manager Desk North,Reset the desk follow-up
33333333-3333-4333-8333-333333333333,2026-04-11T11:30:00.000Z,Revenue Ops Queue,2,1,1,Manager Desk South,1,0,1,cleared,Customer batch-cleared,CASE-BATCH-CL,batch-cleared,Sunrise Residences,en,Next follow-up,2026-04-12T08:00:00.000Z,on_track,0,Omar Saleh,2026-04-11T09:30:00.000Z,false,2026-04-11T11:30:00.000Z,Manager Desk North,Reset the desk follow-up`);
  });

  it("can narrow a batch scope to only the cases that changed later", () => {
    const batchId = "33333333-3333-4333-8333-333333333333";
    const scope = buildRevenueManagerScope(
      [
        buildCase("batch-escalated", {
          followUpStatus: "attention",
          latestHumanReply: {
            approvedFromQa: true,
            message: "Sent the approved update.",
            nextAction: "Confirm callback timing",
            nextActionDueAt: "2026-04-12T09:00:00.000Z",
            sentAt: "2026-04-11T10:00:00.000Z",
            sentByName: "Amina Rahman"
          },
          latestManagerFollowUp: {
            bulkAction: {
              batchId,
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-12T11:00:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-11T11:30:00.000Z"
          },
          openInterventionsCount: 1,
          ownerName: "Manager Desk North"
        }),
        buildCase("batch-cleared", {
          latestManagerFollowUp: {
            bulkAction: {
              batchId,
              caseCount: 3,
              scopedOwnerName: "Revenue Ops Queue"
            },
            nextAction: "Reset the desk follow-up",
            nextActionDueAt: "2026-04-12T11:00:00.000Z",
            ownerName: "Manager Desk North",
            savedAt: "2026-04-11T11:30:00.000Z"
          },
          ownerName: "Manager Desk South"
        })
      ],
      {
        batchDrift: "changed_later",
        bulkBatchId: batchId,
        queue: "escalated_handoffs"
      },
      {
        changedCaseIds: new Set(["batch-escalated"])
      }
    );

    expect(scope.focusedCases.map((caseItem) => caseItem.caseId)).toEqual(["batch-escalated"]);
    expect(scope.batchScope).toEqual({
      batchId,
      caseCount: 3,
      clearedCaseCount: 0,
      currentOwnerNames: ["Manager Desk North"],
      savedAt: "2026-04-11T11:30:00.000Z",
      scopedOwnerName: "Revenue Ops Queue",
      stillEscalatedCaseCount: 1
    });
  });

  it("derives in-product batch history from case detail audit events", () => {
    const batchId = "33333333-3333-4333-8333-333333333333";
    const laterBatchId = "55555555-5555-4555-8555-555555555555";
    const batchEscalated = buildCase("batch-escalated", {
      followUpStatus: "attention",
      latestHumanReply: {
        approvedFromQa: true,
        message: "Sent the approved update.",
        nextAction: "Confirm callback timing",
        nextActionDueAt: "2026-04-12T09:00:00.000Z",
        sentAt: "2026-04-11T10:00:00.000Z",
        sentByName: "Amina Rahman"
      },
      latestManagerFollowUp: {
        bulkAction: {
          batchId,
          caseCount: 3,
          scopedOwnerName: "Revenue Ops Queue"
        },
        nextAction: "Reset the desk follow-up",
        nextActionDueAt: "2026-04-12T11:00:00.000Z",
        ownerName: "Manager Desk North",
        savedAt: "2026-04-11T11:30:00.000Z"
      },
      openInterventionsCount: 1,
      ownerName: "Manager Desk North"
    });
    const batchCleared = buildCase("batch-cleared", {
      latestManagerFollowUp: {
        bulkAction: {
          batchId,
          caseCount: 3,
          scopedOwnerName: "Revenue Ops Queue"
        },
        nextAction: "Reset the desk follow-up",
        nextActionDueAt: "2026-04-12T11:00:00.000Z",
        ownerName: "Manager Desk North",
        savedAt: "2026-04-11T11:30:00.000Z"
      },
      ownerName: "Manager Desk South"
    });
    const scope = buildRevenueManagerScope([batchEscalated, batchCleared], {
      bulkBatchId: batchId,
      queue: "escalated_handoffs"
    });

    const history = buildRevenueManagerBatchHistory(scope, [
      buildCaseDetail(batchEscalated, {
        auditEvents: [
          {
            createdAt: "2026-04-11T11:30:00.000Z",
            eventType: "manager_follow_up_updated",
            payload: {
              bulkActionBatchId: batchId,
              bulkActionCaseCount: 3,
              bulkActionScopedOwnerName: "Revenue Ops Queue",
              nextAction: "Reset the desk follow-up",
              nextActionDueAt: "2026-04-12T11:00:00.000Z",
              ownerName: "Manager Desk North"
            }
          },
          {
            createdAt: "2026-04-12T09:00:00.000Z",
            eventType: "manager_follow_up_updated",
            payload: {
              nextAction: "Call again after finance check",
              nextActionDueAt: "2026-04-13T09:00:00.000Z",
              ownerName: "Manager Desk North"
            }
          },
          {
            createdAt: "2026-04-13T10:00:00.000Z",
            eventType: "manager_follow_up_updated",
            payload: {
              bulkActionBatchId: laterBatchId,
              bulkActionCaseCount: 2,
              bulkActionScopedOwnerName: "Manager Desk North",
              nextAction: "Re-arm this owner cluster",
              nextActionDueAt: "2026-04-14T10:00:00.000Z",
              ownerName: "Manager Desk South"
            }
          }
        ]
      }),
      buildCaseDetail(batchCleared, {
        auditEvents: [
          {
            createdAt: "2026-04-11T11:30:00.000Z",
            eventType: "manager_follow_up_updated",
            payload: {
              bulkActionBatchId: batchId,
              bulkActionCaseCount: 3,
              bulkActionScopedOwnerName: "Revenue Ops Queue",
              nextAction: "Reset the desk follow-up",
              nextActionDueAt: "2026-04-12T11:00:00.000Z",
              ownerName: "Manager Desk North"
            }
          }
        ]
      })
    ]);

    expect(history).toEqual({
      casesWithHistoryCount: 2,
      casesWithLaterChangesCount: 1,
      historyCases: [
        {
          caseId: "batch-escalated",
          currentOwnerName: "Manager Desk North",
          currentRiskStatus: "still_escalated",
          customerName: "Customer batch-escalated",
          entries: [
            {
              batchCaseCount: 2,
              batchId: laterBatchId,
              caseId: "batch-escalated",
              createdAt: "2026-04-13T10:00:00.000Z",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer batch-escalated",
              nextAction: "Re-arm this owner cluster",
              nextActionDueAt: "2026-04-14T10:00:00.000Z",
              ownerName: "Manager Desk South",
              scopedOwnerName: "Manager Desk North",
              type: "later_bulk_reset"
            },
            {
              caseId: "batch-escalated",
              createdAt: "2026-04-12T09:00:00.000Z",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer batch-escalated",
              nextAction: "Call again after finance check",
              nextActionDueAt: "2026-04-13T09:00:00.000Z",
              ownerName: "Manager Desk North",
              type: "follow_up_update"
            },
            {
              batchCaseCount: 3,
              batchId,
              caseId: "batch-escalated",
              createdAt: "2026-04-11T11:30:00.000Z",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer batch-escalated",
              nextAction: "Reset the desk follow-up",
              nextActionDueAt: "2026-04-12T11:00:00.000Z",
              ownerName: "Manager Desk North",
              scopedOwnerName: "Revenue Ops Queue",
              type: "scoped_batch_reset"
            }
          ]
        },
        {
          caseId: "batch-cleared",
          currentOwnerName: "Manager Desk South",
          currentRiskStatus: "cleared",
          customerName: "Customer batch-cleared",
          entries: [
            {
              batchCaseCount: 3,
              batchId,
              caseId: "batch-cleared",
              createdAt: "2026-04-11T11:30:00.000Z",
              currentOwnerName: "Manager Desk South",
              currentRiskStatus: "cleared",
              customerName: "Customer batch-cleared",
              nextAction: "Reset the desk follow-up",
              nextActionDueAt: "2026-04-12T11:00:00.000Z",
              ownerName: "Manager Desk North",
              scopedOwnerName: "Revenue Ops Queue",
              type: "scoped_batch_reset"
            }
          ]
        }
      ],
      laterBulkResetCount: 1,
      postBatchFollowUpUpdateCount: 1
    });
    expect(buildRevenueManagerDriftedCaseIds(history)).toEqual(["batch-escalated"]);
    expect(buildRevenueManagerBatchDriftReasonSummaries(history)).toEqual([
      {
        caseId: "batch-escalated",
        laterBulkResetCount: 1,
        latestDriftAt: "2026-04-13T10:00:00.000Z",
        postBatchFollowUpUpdateCount: 1,
        reasons: ["follow_up_update", "later_bulk_reset"]
      }
    ]);
    expect(buildRevenueManagerBatchDriftReasonMixSummary(history)).toEqual({
      driftedCaseCount: 1,
      followUpUpdateOnlyCaseCount: 0,
      laterBulkResetOnlyCaseCount: 0,
      mixedReasonCaseCount: 1
    });
    expect(buildRevenueManagerDriftedCaseIdsByReason(history, "mixed")).toEqual(["batch-escalated"]);
    expect(buildRevenueManagerDriftedCaseIdsByReason(history, "follow_up_only")).toEqual([]);
    expect(buildRevenueManagerDriftedCaseIdsByReason(history, "later_bulk_reset_only")).toEqual([]);
  });

  it("summarizes drift-reason mix across follow-up-only, bulk-only, and mixed cases", () => {
    expect(
      buildRevenueManagerBatchDriftReasonMixSummary({
        casesWithHistoryCount: 3,
        casesWithLaterChangesCount: 3,
        historyCases: [
          {
            caseId: "follow-up-only",
            currentOwnerName: "Manager Desk North",
            currentRiskStatus: "still_escalated",
            customerName: "Customer follow-up-only",
            entries: [
              {
                batchCaseCount: 3,
                batchId: "33333333-3333-4333-8333-333333333333",
                caseId: "follow-up-only",
                createdAt: "2026-04-13T09:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer follow-up-only",
                nextAction: "Original reset",
                nextActionDueAt: "2026-04-13T10:00:00.000Z",
                ownerName: "Manager Desk North",
                scopedOwnerName: "Revenue Ops Queue",
                type: "scoped_batch_reset"
              },
              {
                caseId: "follow-up-only",
                createdAt: "2026-04-13T11:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer follow-up-only",
                nextAction: "Manual follow-up",
                nextActionDueAt: "2026-04-13T12:00:00.000Z",
                ownerName: "Manager Desk North",
                type: "follow_up_update"
              }
            ]
          },
          {
            caseId: "bulk-only",
            currentOwnerName: "Manager Desk North",
            currentRiskStatus: "still_escalated",
            customerName: "Customer bulk-only",
            entries: [
              {
                batchCaseCount: 3,
                batchId: "33333333-3333-4333-8333-333333333333",
                caseId: "bulk-only",
                createdAt: "2026-04-13T09:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer bulk-only",
                nextAction: "Original reset",
                nextActionDueAt: "2026-04-13T10:00:00.000Z",
                ownerName: "Manager Desk North",
                scopedOwnerName: "Revenue Ops Queue",
                type: "scoped_batch_reset"
              },
              {
                batchCaseCount: 2,
                batchId: "44444444-4444-4444-8444-444444444444",
                caseId: "bulk-only",
                createdAt: "2026-04-13T11:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer bulk-only",
                nextAction: "Later batch reset",
                nextActionDueAt: "2026-04-13T12:00:00.000Z",
                ownerName: "Manager Desk North",
                scopedOwnerName: "Manager Desk North",
                type: "later_bulk_reset"
              }
            ]
          },
          {
            caseId: "mixed",
            currentOwnerName: "Manager Desk North",
            currentRiskStatus: "still_escalated",
            customerName: "Customer mixed",
            entries: [
              {
                batchCaseCount: 3,
                batchId: "33333333-3333-4333-8333-333333333333",
                caseId: "mixed",
                createdAt: "2026-04-13T09:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer mixed",
                nextAction: "Original reset",
                nextActionDueAt: "2026-04-13T10:00:00.000Z",
                ownerName: "Manager Desk North",
                scopedOwnerName: "Revenue Ops Queue",
                type: "scoped_batch_reset"
              },
              {
                caseId: "mixed",
                createdAt: "2026-04-13T11:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer mixed",
                nextAction: "Manual follow-up",
                nextActionDueAt: "2026-04-13T12:00:00.000Z",
                ownerName: "Manager Desk North",
                type: "follow_up_update"
              },
              {
                batchCaseCount: 2,
                batchId: "55555555-5555-4555-8555-555555555555",
                caseId: "mixed",
                createdAt: "2026-04-13T12:00:00.000Z",
                currentOwnerName: "Manager Desk North",
                currentRiskStatus: "still_escalated",
                customerName: "Customer mixed",
                nextAction: "Later batch reset",
                nextActionDueAt: "2026-04-13T13:00:00.000Z",
                ownerName: "Manager Desk North",
                scopedOwnerName: "Manager Desk North",
                type: "later_bulk_reset"
              }
            ]
          }
        ],
        laterBulkResetCount: 2,
        postBatchFollowUpUpdateCount: 2
      })
    ).toEqual({
      driftedCaseCount: 3,
      followUpUpdateOnlyCaseCount: 1,
      laterBulkResetOnlyCaseCount: 1,
      mixedReasonCaseCount: 1
    });
    expect(
      buildRevenueManagerDriftedCaseIdsByReason(
        {
          casesWithHistoryCount: 3,
          casesWithLaterChangesCount: 3,
          historyCases: [
            {
              caseId: "follow-up-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer follow-up-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                }
              ]
            },
            {
              caseId: "bulk-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer bulk-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  batchCaseCount: 2,
                  batchId: "44444444-4444-4444-8444-444444444444",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            },
            {
              caseId: "mixed",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer mixed",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "mixed",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "mixed",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                },
                {
                  batchCaseCount: 2,
                  batchId: "55555555-5555-4555-8555-555555555555",
                  caseId: "mixed",
                  createdAt: "2026-04-13T12:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T13:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            }
          ],
          laterBulkResetCount: 2,
          postBatchFollowUpUpdateCount: 2
        },
        "follow_up_only"
      )
    ).toEqual(["follow-up-only"]);
    expect(
      buildRevenueManagerDriftedCaseIdsByReason(
        {
          casesWithHistoryCount: 3,
          casesWithLaterChangesCount: 3,
          historyCases: [
            {
              caseId: "follow-up-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer follow-up-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                }
              ]
            },
            {
              caseId: "bulk-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer bulk-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  batchCaseCount: 2,
                  batchId: "44444444-4444-4444-8444-444444444444",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            },
            {
              caseId: "mixed",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer mixed",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "mixed",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "mixed",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                },
                {
                  batchCaseCount: 2,
                  batchId: "55555555-5555-4555-8555-555555555555",
                  caseId: "mixed",
                  createdAt: "2026-04-13T12:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T13:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            }
          ],
          laterBulkResetCount: 2,
          postBatchFollowUpUpdateCount: 2
        },
        "later_bulk_reset_only"
      )
    ).toEqual(["bulk-only"]);
    expect(
      buildRevenueManagerDriftedCaseIdsByReason(
        {
          casesWithHistoryCount: 3,
          casesWithLaterChangesCount: 3,
          historyCases: [
            {
              caseId: "follow-up-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer follow-up-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "follow-up-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer follow-up-only",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                }
              ]
            },
            {
              caseId: "bulk-only",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer bulk-only",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  batchCaseCount: 2,
                  batchId: "44444444-4444-4444-8444-444444444444",
                  caseId: "bulk-only",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer bulk-only",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            },
            {
              caseId: "mixed",
              currentOwnerName: "Manager Desk North",
              currentRiskStatus: "still_escalated",
              customerName: "Customer mixed",
              entries: [
                {
                  batchCaseCount: 3,
                  batchId: "33333333-3333-4333-8333-333333333333",
                  caseId: "mixed",
                  createdAt: "2026-04-13T09:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Original reset",
                  nextActionDueAt: "2026-04-13T10:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Revenue Ops Queue",
                  type: "scoped_batch_reset"
                },
                {
                  caseId: "mixed",
                  createdAt: "2026-04-13T11:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Manual follow-up",
                  nextActionDueAt: "2026-04-13T12:00:00.000Z",
                  ownerName: "Manager Desk North",
                  type: "follow_up_update"
                },
                {
                  batchCaseCount: 2,
                  batchId: "55555555-5555-4555-8555-555555555555",
                  caseId: "mixed",
                  createdAt: "2026-04-13T12:00:00.000Z",
                  currentOwnerName: "Manager Desk North",
                  currentRiskStatus: "still_escalated",
                  customerName: "Customer mixed",
                  nextAction: "Later batch reset",
                  nextActionDueAt: "2026-04-13T13:00:00.000Z",
                  ownerName: "Manager Desk North",
                  scopedOwnerName: "Manager Desk North",
                  type: "later_bulk_reset"
                }
              ]
            }
          ],
          laterBulkResetCount: 2,
          postBatchFollowUpUpdateCount: 2
        },
        "mixed"
      )
    ).toEqual(["mixed"]);
  });
});
