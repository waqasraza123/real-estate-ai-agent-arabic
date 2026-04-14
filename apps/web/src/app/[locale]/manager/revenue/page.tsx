import { canOperatorRoleAccessWorkspace, type PersistedCaseDetail, type SupportedLocale } from "@real-estate-ai/contracts";

import { ManagerWorkspaceUnavailable, RevenueManagerCommandCenter } from "@/components/manager-command-center";
import { tryGetPersistedCaseDetail, tryGetPersistedGovernanceSummary, tryListPersistedCases } from "@/lib/live-api";
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
  const [persistedCases, governanceReport] = await Promise.all([tryListPersistedCases(), tryGetPersistedGovernanceSummary()]);
  const baseRevenueScope = buildRevenueManagerScope(persistedCases, filters);
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
      currentOperatorRole={currentOperatorRole}
      driftedBatchCaseIds={driftedBatchCaseIds}
      filters={filters}
      governanceReport={governanceReport}
      locale={locale}
      persistedCases={persistedCases}
    />
  );
}
