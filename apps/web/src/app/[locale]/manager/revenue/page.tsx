import { canOperatorRoleAccessWorkspace, type CommercialFactKind, type PersistedCaseDetail, type SupportedLocale } from "@real-estate-ai/contracts";

import { ManagerWorkspaceUnavailable, RevenueManagerCommandCenter } from "@/components/manager-command-center";
import {
  tryGetPersistedCaseDetail,
  tryGetPersistedGovernanceSummary,
  tryListActiveCommercialFacts,
  tryListCommercialEvidenceGaps,
  tryListCommercialFactProposals,
  tryListCommercialSources,
  tryListPersistedCases
} from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import {
  buildRevenueManagerBatchHistory,
  buildRevenueManagerDriftedCaseIdsByReason,
  buildRevenueManagerDriftedCaseIds,
  buildRevenueManagerScope,
  parseRevenueManagerFilters
} from "@/lib/revenue-manager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RevenueManagerPage(props: PageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([props.params, props.searchParams]);
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole)) {
    return <ManagerWorkspaceUnavailable currentOperatorRole={currentOperatorRole} locale={locale} workspace="manager_revenue" />;
  }

  const filters = parseRevenueManagerFilters(rawSearchParams);
  const [persistedCases, governanceReport, commercialSources, commercialProposals, commercialFacts, commercialEvidenceGaps] = await Promise.all([
    tryListPersistedCases(),
    tryGetPersistedGovernanceSummary(),
    tryListCommercialSources(currentOperatorRole),
    tryListCommercialFactProposals(currentOperatorRole),
    tryListActiveCommercialFacts(currentOperatorRole),
    tryListCommercialEvidenceGaps(currentOperatorRole)
  ]);
  const baseRevenueScope = buildRevenueManagerScope(persistedCases, filters);
  const commercialFactKinds: CommercialFactKind[] = [
    "pricing",
    "payment_plan",
    "availability",
    "policy",
    "document_requirement",
    "fees",
    "handover_date",
    "unit_status",
    "visit_terms"
  ];
  const readinessProjects = Array.from(
    new Set([
      ...commercialFacts.map((fact) => fact.projectCode),
      ...commercialProposals.map((proposal) => proposal.projectCode),
      ...commercialEvidenceGaps.map((gap) => gap.projectCode)
    ])
  ).sort();
  const commercialReadinessKindBreakdown = readinessProjects
    .flatMap((projectCode) =>
      commercialFactKinds.map((kind) => {
        const factsForKind = commercialFacts.filter((fact) => fact.projectCode === projectCode && fact.kind === kind);
        const pendingProposalsForKind = commercialProposals.filter(
          (proposal) => proposal.projectCode === projectCode && proposal.kind === kind && proposal.state === "pending_review"
        );
        const evidenceGapsForKind = commercialEvidenceGaps.filter((gap) => gap.projectCode === projectCode && gap.kind === kind && gap.status === "open");

        return {
          activeApprovedFactsCount: factsForKind.filter((fact) => fact.freshnessStatus === "active" || fact.freshnessStatus === "expiring_soon").length,
          expiringSoonFactsCount: factsForKind.filter((fact) => fact.freshnessStatus === "expiring_soon").length,
          kind,
          openEvidenceGapsCount: evidenceGapsForKind.length,
          pendingApprovalsCount: pendingProposalsForKind.length,
          projectCode,
          staleFactsCount: factsForKind.filter((fact) => fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired").length
        };
      })
    )
    .filter(
      (item) =>
        item.activeApprovedFactsCount > 0 ||
        item.expiringSoonFactsCount > 0 ||
        item.openEvidenceGapsCount > 0 ||
        item.pendingApprovalsCount > 0 ||
        item.staleFactsCount > 0
    )
    .sort(
      (a, b) =>
        b.openEvidenceGapsCount - a.openEvidenceGapsCount ||
        b.pendingApprovalsCount - a.pendingApprovalsCount ||
        b.staleFactsCount - a.staleFactsCount ||
        a.projectCode.localeCompare(b.projectCode) ||
        a.kind.localeCompare(b.kind)
    );
  const batchCaseDetails =
    filters.bulkBatchId && baseRevenueScope.focusedCases.length > 0
      ? await Promise.all(baseRevenueScope.focusedCases.map((caseItem) => tryGetPersistedCaseDetail(caseItem.caseId)))
      : [];
  const availableBatchCaseDetails = batchCaseDetails.filter((caseDetail): caseDetail is PersistedCaseDetail => caseDetail !== null);
  const baseBatchHistory =
    filters.bulkBatchId && baseRevenueScope.batchScope
      ? buildRevenueManagerBatchHistory(baseRevenueScope, availableBatchCaseDetails)
      : null;
  const driftedBatchCaseIds = filters.batchDriftReason
    ? buildRevenueManagerDriftedCaseIdsByReason(baseBatchHistory, filters.batchDriftReason)
    : buildRevenueManagerDriftedCaseIds(baseBatchHistory);
  const revenueScope =
    filters.batchDrift === "changed_later"
      ? buildRevenueManagerScope(persistedCases, filters, { changedCaseIds: new Set(driftedBatchCaseIds) })
      : baseRevenueScope;
  const batchHistory =
    filters.bulkBatchId && revenueScope.batchScope
      ? buildRevenueManagerBatchHistory(
          revenueScope,
          availableBatchCaseDetails.filter((caseDetail) => revenueScope.focusedCases.some((caseItem) => caseItem.caseId === caseDetail.caseId))
        )
      : null;

  return (
    <RevenueManagerCommandCenter
      batchHistory={batchHistory}
      commercialReadiness={{
        activeApprovedFactsCount: commercialFacts.filter((fact) => fact.freshnessStatus === "active" || fact.freshnessStatus === "expiring_soon").length,
        blockedAgentRepliesCount: persistedCases.filter((caseItem) => caseItem.agentState?.latestBlockedReason === "commercial_facts_missing").length,
        expiringSoonFactsCount: commercialFacts.filter((fact) => fact.freshnessStatus === "expiring_soon").length,
        kindBreakdown: commercialReadinessKindBreakdown,
        latestInventorySourceVersion: commercialSources.find((source) => source.sourceType === "inventory_csv")?.latestVersion?.versionLabel ?? null,
        openEvidenceGapsCount: commercialEvidenceGaps.filter((gap) => gap.status === "open").length,
        pendingApprovalsCount: commercialProposals.filter((proposal) => proposal.state === "pending_review").length,
        staleFactsCount: commercialFacts.filter((fact) => fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired").length
      }}
      currentOperatorRole={currentOperatorRole}
      driftedBatchCaseIds={driftedBatchCaseIds}
      filters={filters}
      governanceReport={governanceReport}
      locale={locale}
      persistedCases={persistedCases}
    />
  );
}
