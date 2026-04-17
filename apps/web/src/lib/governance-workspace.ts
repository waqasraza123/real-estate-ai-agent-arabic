import type {
  CaseQaPolicySignal,
  PersistedCaseDetail,
  PersistedCaseSummary,
  HandoverCustomerUpdateQaPolicySignal
} from "@real-estate-ai/contracts";

import { hasPersistedLatestHumanReplyEscalation } from "./persisted-case-presenters";
import {
  buildRevenueManagerBatchDriftReasonMixSummary,
  type RevenueManagerBatchHistorySummary
} from "./revenue-manager";

type PersistedGovernanceCase = PersistedCaseDetail | PersistedCaseSummary;

type GovernanceAttentionStatus = "follow_up_required" | "pending_review";

export interface GovernanceSignalCount {
  count: number;
  kind: "case_message" | "handover_customer_update";
  signal: CaseQaPolicySignal | HandoverCustomerUpdateQaPolicySignal;
}

export interface GovernanceOperationalRiskOwner {
  escalatedHandoffCount: number;
  latestSenderNames: string[];
  openInterventionsCount: number;
  overdueHandoffCount: number;
  ownerName: string;
}

export interface GovernanceOperationalRiskBulkBatch {
  batchId: string;
  caseCount: number;
  clearedCaseCount: number;
  currentOwnerNames: string[];
  drift?: GovernanceOperationalRiskBatchDrift;
  savedAt: string;
  scopedOwnerName: string;
  stillEscalatedCaseCount: number;
}

export type GovernanceOperationalRiskExportScope =
  | "full_batch"
  | "changed_later"
  | "follow_up_only"
  | "later_bulk_reset_only"
  | "mixed";

export interface GovernanceOperationalRiskExportCandidate {
  batchId: string;
  caseCount: number;
  priority: "high" | "medium" | "baseline";
  savedAt: string;
  scopedOwnerName: string;
  scope: GovernanceOperationalRiskExportScope;
  score: number;
  stillEscalatedCaseCount: number;
}

export interface GovernanceOperationalRiskBatchDrift {
  casesWithHistoryCount: number;
  casesWithLaterChangesCount: number;
  followUpUpdateOnlyCaseCount: number;
  laterBulkResetCount: number;
  laterBulkResetOnlyCaseCount: number;
  mixedReasonCaseCount: number;
  postBatchFollowUpUpdateCount: number;
}

export interface GovernanceOperationalRiskSummary {
  batchesWithDriftCount: number;
  bulkBatches: GovernanceOperationalRiskBulkBatch[];
  driftedCaseCount: number;
  escalatedReplyHandoffCases: PersistedGovernanceCase[];
  exportCandidates: GovernanceOperationalRiskExportCandidate[];
  followUpUpdateOnlyDriftCaseCount: number;
  laterBulkResetCount: number;
  laterBulkResetOnlyDriftCaseCount: number;
  mixedReasonDriftCaseCount: number;
  owners: GovernanceOperationalRiskOwner[];
  postBatchFollowUpUpdateCount: number;
  totalEscalatedReplyHandoffCount: number;
}

export function buildManagerGovernanceSummary(
  persistedCases: PersistedGovernanceCase[],
  options: { now?: Date } = {}
) {
  const revenueAttentionCases = [...persistedCases]
    .filter((caseItem) => getRevenueGovernanceStatus(caseItem) !== null)
    .sort((left, right) =>
      compareGovernanceItems(
        getRevenueGovernanceStatus(left) ?? "follow_up_required",
        left.currentQaReview?.updatedAt ?? left.updatedAt,
        getRevenueGovernanceStatus(right) ?? "follow_up_required",
        right.currentQaReview?.updatedAt ?? right.updatedAt
      )
    );

  const handoverAttentionCases = [...persistedCases]
    .filter((caseItem) => getHandoverGovernanceStatus(caseItem) !== null)
    .sort((left, right) =>
      compareGovernanceItems(
        getHandoverGovernanceStatus(left) ?? "follow_up_required",
        left.currentHandoverCustomerUpdateQaReview?.updatedAt ?? left.updatedAt,
        getHandoverGovernanceStatus(right) ?? "follow_up_required",
        right.currentHandoverCustomerUpdateQaReview?.updatedAt ?? right.updatedAt
      )
    );

  const pendingCasesCount =
    revenueAttentionCases.filter((caseItem) => getRevenueGovernanceStatus(caseItem) === "pending_review").length +
    handoverAttentionCases.filter((caseItem) => getHandoverGovernanceStatus(caseItem) === "pending_review").length;

  const followUpRequiredCasesCount =
    revenueAttentionCases.filter((caseItem) => getRevenueGovernanceStatus(caseItem) === "follow_up_required").length +
    handoverAttentionCases.filter((caseItem) => getHandoverGovernanceStatus(caseItem) === "follow_up_required").length;

  const now = options.now ?? new Date();
  const stalePendingCasesCount =
    revenueAttentionCases.filter((caseItem) => isGovernanceItemStale(getRevenueGovernanceStatus(caseItem), caseItem.currentQaReview?.updatedAt, now)).length +
    handoverAttentionCases.filter((caseItem) =>
      isGovernanceItemStale(getHandoverGovernanceStatus(caseItem), caseItem.currentHandoverCustomerUpdateQaReview?.updatedAt, now)
    ).length;

  const policyTriggeredCasesCount =
    revenueAttentionCases.filter((caseItem) => caseItem.currentQaReview?.triggerSource === "policy_rule").length + handoverAttentionCases.length;
  const manualRequestCasesCount = revenueAttentionCases.filter((caseItem) => caseItem.currentQaReview?.triggerSource === "manual_request").length;

  const topPolicySignals = buildTopGovernanceSignals(revenueAttentionCases, handoverAttentionCases);

  return {
    followUpRequiredCasesCount,
    handoverAttentionCases,
    manualRequestCasesCount,
    pendingCasesCount,
    policyTriggeredCasesCount,
    revenueAttentionCases,
    stalePendingCasesCount,
    topPolicySignals,
    totalAttentionCasesCount: revenueAttentionCases.length + handoverAttentionCases.length,
    uniqueAttentionCaseCount: new Set(
      [...revenueAttentionCases, ...handoverAttentionCases].map((caseItem) => caseItem.caseId)
    ).size
  };
}

export function buildGovernanceOperationalRiskSummary(
  persistedCases: PersistedGovernanceCase[],
  options: { batchHistoryByBatchId?: ReadonlyMap<string, RevenueManagerBatchHistorySummary> } = {}
): GovernanceOperationalRiskSummary {
  const escalatedReplyHandoffCases = persistedCases.filter((caseItem) =>
    hasPersistedLatestHumanReplyEscalation(
      caseItem.ownerName,
      caseItem.latestHumanReply,
      caseItem.followUpStatus,
      caseItem.openInterventionsCount
    )
  );

  const owners = new Map<string, GovernanceOperationalRiskOwner>();
  const bulkBatches = new Map<string, GovernanceOperationalRiskBulkBatch>();

  for (const caseItem of escalatedReplyHandoffCases) {
    const currentOwner = owners.get(caseItem.ownerName) ?? {
      escalatedHandoffCount: 0,
      latestSenderNames: [],
      openInterventionsCount: 0,
      overdueHandoffCount: 0,
      ownerName: caseItem.ownerName
    };

    const nextSenderNames = caseItem.latestHumanReply?.sentByName
      ? [...new Set([...currentOwner.latestSenderNames, caseItem.latestHumanReply.sentByName])]
      : currentOwner.latestSenderNames;

    owners.set(caseItem.ownerName, {
      escalatedHandoffCount: currentOwner.escalatedHandoffCount + 1,
      latestSenderNames: nextSenderNames,
      openInterventionsCount: currentOwner.openInterventionsCount + caseItem.openInterventionsCount,
      overdueHandoffCount: currentOwner.overdueHandoffCount + (caseItem.followUpStatus === "attention" ? 1 : 0),
      ownerName: caseItem.ownerName
    });
  }

  for (const caseItem of persistedCases) {
    const bulkAction = caseItem.latestManagerFollowUp?.bulkAction;

    if (!bulkAction) {
      continue;
    }

    const currentBatch = bulkBatches.get(bulkAction.batchId) ?? {
      batchId: bulkAction.batchId,
      caseCount: bulkAction.caseCount,
      clearedCaseCount: 0,
      currentOwnerNames: [],
      savedAt: caseItem.latestManagerFollowUp?.savedAt ?? caseItem.updatedAt,
      scopedOwnerName: bulkAction.scopedOwnerName,
      stillEscalatedCaseCount: 0
    };

    const isStillEscalated = hasPersistedLatestHumanReplyEscalation(
      caseItem.ownerName,
      caseItem.latestHumanReply,
      caseItem.followUpStatus,
      caseItem.openInterventionsCount
    );

    bulkBatches.set(bulkAction.batchId, {
      ...currentBatch,
      caseCount: Math.max(currentBatch.caseCount, bulkAction.caseCount),
      clearedCaseCount: currentBatch.clearedCaseCount + (isStillEscalated ? 0 : 1),
      currentOwnerNames: [...new Set([...currentBatch.currentOwnerNames, caseItem.ownerName])],
      savedAt:
        new Date(caseItem.latestManagerFollowUp?.savedAt ?? caseItem.updatedAt).getTime() >
        new Date(currentBatch.savedAt).getTime()
          ? caseItem.latestManagerFollowUp?.savedAt ?? caseItem.updatedAt
          : currentBatch.savedAt,
      stillEscalatedCaseCount: currentBatch.stillEscalatedCaseCount + (isStillEscalated ? 1 : 0)
    });
  }

  const recentBulkBatches = [...bulkBatches.values()]
    .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime())
    .slice(0, 5)
    .map((batch) => {
      const history = options.batchHistoryByBatchId?.get(batch.batchId);

      if (!history) {
        return batch;
      }

      const driftReasonMix = buildRevenueManagerBatchDriftReasonMixSummary(history);

      return {
        ...batch,
        drift: {
          casesWithHistoryCount: history.casesWithHistoryCount,
          casesWithLaterChangesCount: history.casesWithLaterChangesCount,
          followUpUpdateOnlyCaseCount: driftReasonMix.followUpUpdateOnlyCaseCount,
          laterBulkResetCount: history.laterBulkResetCount,
          laterBulkResetOnlyCaseCount: driftReasonMix.laterBulkResetOnlyCaseCount,
          mixedReasonCaseCount: driftReasonMix.mixedReasonCaseCount,
          postBatchFollowUpUpdateCount: history.postBatchFollowUpUpdateCount
        }
      };
    });
  const batchesWithDriftCount = recentBulkBatches.filter((batch) => (batch.drift?.casesWithLaterChangesCount ?? 0) > 0).length;
  const driftedCaseCount = recentBulkBatches.reduce((total, batch) => total + (batch.drift?.casesWithLaterChangesCount ?? 0), 0);
  const followUpUpdateOnlyDriftCaseCount = recentBulkBatches.reduce(
    (total, batch) => total + (batch.drift?.followUpUpdateOnlyCaseCount ?? 0),
    0
  );
  const laterBulkResetCount = recentBulkBatches.reduce((total, batch) => total + (batch.drift?.laterBulkResetCount ?? 0), 0);
  const laterBulkResetOnlyDriftCaseCount = recentBulkBatches.reduce(
    (total, batch) => total + (batch.drift?.laterBulkResetOnlyCaseCount ?? 0),
    0
  );
  const mixedReasonDriftCaseCount = recentBulkBatches.reduce((total, batch) => total + (batch.drift?.mixedReasonCaseCount ?? 0), 0);
  const postBatchFollowUpUpdateCount = recentBulkBatches.reduce(
    (total, batch) => total + (batch.drift?.postBatchFollowUpUpdateCount ?? 0),
    0
  );
  const exportCandidates = buildGovernanceOperationalRiskExportCandidates(recentBulkBatches);

  return {
    batchesWithDriftCount,
    bulkBatches: recentBulkBatches,
    driftedCaseCount,
    escalatedReplyHandoffCases,
    exportCandidates,
    followUpUpdateOnlyDriftCaseCount,
    laterBulkResetCount,
    laterBulkResetOnlyDriftCaseCount,
    mixedReasonDriftCaseCount,
    owners: [...owners.values()]
      .sort((left, right) => {
        if (left.escalatedHandoffCount !== right.escalatedHandoffCount) {
          return right.escalatedHandoffCount - left.escalatedHandoffCount;
        }

        if (left.openInterventionsCount !== right.openInterventionsCount) {
          return right.openInterventionsCount - left.openInterventionsCount;
        }

        return left.ownerName.localeCompare(right.ownerName);
      })
      .slice(0, 5),
    postBatchFollowUpUpdateCount,
    totalEscalatedReplyHandoffCount: escalatedReplyHandoffCases.length
  };
}

function buildGovernanceOperationalRiskExportCandidates(
  recentBulkBatches: GovernanceOperationalRiskBulkBatch[]
): GovernanceOperationalRiskExportCandidate[] {
  return recentBulkBatches
    .flatMap((batch) => {
      const candidates: GovernanceOperationalRiskExportCandidate[] = [
        buildGovernanceOperationalRiskExportCandidate(batch, "full_batch", batch.caseCount)
      ];

      const drift = batch.drift;

      if (!drift || drift.casesWithLaterChangesCount <= 0) {
        return candidates;
      }

      candidates.push(buildGovernanceOperationalRiskExportCandidate(batch, "changed_later", drift.casesWithLaterChangesCount));

      if (drift.followUpUpdateOnlyCaseCount > 0) {
        candidates.push(buildGovernanceOperationalRiskExportCandidate(batch, "follow_up_only", drift.followUpUpdateOnlyCaseCount));
      }

      if (drift.laterBulkResetOnlyCaseCount > 0) {
        candidates.push(
          buildGovernanceOperationalRiskExportCandidate(batch, "later_bulk_reset_only", drift.laterBulkResetOnlyCaseCount)
        );
      }

      if (drift.mixedReasonCaseCount > 0) {
        candidates.push(buildGovernanceOperationalRiskExportCandidate(batch, "mixed", drift.mixedReasonCaseCount));
      }

      return candidates;
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.caseCount !== right.caseCount) {
        return right.caseCount - left.caseCount;
      }

      return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
    })
    .slice(0, 5);
}

function buildGovernanceOperationalRiskExportCandidate(
  batch: GovernanceOperationalRiskBulkBatch,
  scope: GovernanceOperationalRiskExportScope,
  caseCount: number
): GovernanceOperationalRiskExportCandidate {
  const scopeWeight = getGovernanceOperationalRiskExportScopeWeight(scope);
  const score = scopeWeight + caseCount * 10 + batch.stillEscalatedCaseCount * 3;

  return {
    batchId: batch.batchId,
    caseCount,
    priority: score >= 300 ? "high" : score >= 200 ? "medium" : "baseline",
    savedAt: batch.savedAt,
    scopedOwnerName: batch.scopedOwnerName,
    scope,
    score,
    stillEscalatedCaseCount: batch.stillEscalatedCaseCount
  };
}

function getGovernanceOperationalRiskExportScopeWeight(scope: GovernanceOperationalRiskExportScope) {
  switch (scope) {
    case "mixed":
      return 300;
    case "changed_later":
      return 250;
    case "follow_up_only":
      return 220;
    case "later_bulk_reset_only":
      return 210;
    case "full_batch":
      return 120;
  }
}

function buildTopGovernanceSignals(
  revenueAttentionCases: PersistedGovernanceCase[],
  handoverAttentionCases: PersistedGovernanceCase[]
): GovernanceSignalCount[] {
  const signalCounts = new Map<string, GovernanceSignalCount>();

  for (const caseItem of revenueAttentionCases) {
    for (const signal of caseItem.currentQaReview?.policySignals ?? []) {
      const key = `case:${signal}`;
      const current = signalCounts.get(key);

      signalCounts.set(key, {
        count: (current?.count ?? 0) + 1,
        kind: "case_message",
        signal
      });
    }
  }

  for (const caseItem of handoverAttentionCases) {
    for (const signal of caseItem.currentHandoverCustomerUpdateQaReview?.policySignals ?? []) {
      const key = `handover:${signal}`;
      const current = signalCounts.get(key);

      signalCounts.set(key, {
        count: (current?.count ?? 0) + 1,
        kind: "handover_customer_update",
        signal
      });
    }
  }

  return [...signalCounts.values()]
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      if (left.kind !== right.kind) {
        return left.kind.localeCompare(right.kind);
      }

      return left.signal.localeCompare(right.signal);
    })
    .slice(0, 3);
}

function compareGovernanceItems(
  leftStatus: GovernanceAttentionStatus,
  leftUpdatedAt: string,
  rightStatus: GovernanceAttentionStatus,
  rightUpdatedAt: string
) {
  const leftPriority = getGovernanceStatusPriority(leftStatus);
  const rightPriority = getGovernanceStatusPriority(rightStatus);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return new Date(rightUpdatedAt).getTime() - new Date(leftUpdatedAt).getTime();
}

function getGovernanceStatusPriority(status: GovernanceAttentionStatus) {
  return status === "pending_review" ? 0 : 1;
}

function isGovernanceItemStale(status: GovernanceAttentionStatus | null | undefined, updatedAt: string | undefined, now: Date) {
  if (status !== "pending_review" || !updatedAt) {
    return false;
  }

  return now.getTime() - new Date(updatedAt).getTime() >= 24 * 60 * 60 * 1000;
}

function getRevenueGovernanceStatus(caseItem: PersistedGovernanceCase): GovernanceAttentionStatus | null {
  return caseItem.currentQaReview?.status === "pending_review" || caseItem.currentQaReview?.status === "follow_up_required"
    ? caseItem.currentQaReview.status
    : null;
}

function getHandoverGovernanceStatus(caseItem: PersistedGovernanceCase): GovernanceAttentionStatus | null {
  return (
    caseItem.currentHandoverCustomerUpdateQaReview?.reviewStatus === "pending_review" ||
    caseItem.currentHandoverCustomerUpdateQaReview?.reviewStatus === "follow_up_required"
  )
    ? caseItem.currentHandoverCustomerUpdateQaReview.reviewStatus
    : null;
}
