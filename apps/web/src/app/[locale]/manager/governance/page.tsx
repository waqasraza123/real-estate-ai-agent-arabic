import { canOperatorRoleAccessWorkspace, type PersistedCaseDetail, type SupportedLocale } from "@real-estate-ai/contracts";
import { Panel, pageStackClassName, panelSummaryClassName } from "@real-estate-ai/ui";

import { ManagerGovernanceReport } from "@/components/manager-governance-report";
import { ScreenIntro } from "@/components/screen-intro";
import { buildGovernanceOperationalRiskSummary } from "@/lib/governance-workspace";
import {
  parseGovernanceReportExportRecipient,
  parseGovernanceReportSearchParams,
  parseGovernanceReportView
} from "@/lib/governance-report";
import {
  tryGetPersistedCaseDetail,
  tryGetPersistedGovernanceEvents,
  tryGetPersistedGovernanceSummary,
  tryListPersistedCases
} from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { buildRevenueManagerBatchHistory, buildRevenueManagerScope } from "@/lib/revenue-manager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManagerGovernanceReportPage(props: PageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([props.params, props.searchParams]);
  const currentOperatorRole = await getCurrentOperatorRole();
  const canAccessManagerReport =
    canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole) ||
    canOperatorRoleAccessWorkspace("manager_handover", currentOperatorRole);

  if (!canAccessManagerReport) {
    return (
      <div className={pageStackClassName}>
        <ScreenIntro
          badge={locale === "ar" ? "تقرير الحوكمة" : "Governance report"}
          summary={
            locale === "ar"
              ? "هذا التقرير مخصص للأدوار التي تملك قيادة الإيرادات أو قيادة التسليم داخل وضع الجلسة المحلي الموثوق."
              : "This report is reserved for roles that own either the revenue or handover manager surface in trusted local session mode."
          }
          title={locale === "ar" ? "تقرير الحوكمة" : "Governance report"}
        />
        <Panel title={locale === "ar" ? "وصول إداري مطلوب" : "Manager access required"}>
          <div className={pageStackClassName}>
            <p className={panelSummaryClassName}>
              {locale === "ar"
                ? "افتح بوابة الإدارة أو مساحة العمل المتاحة لهذا الدور للوصول إلى تقارير الحوكمة الحية."
                : "Open the manager gateway or an available workspace for this role to access live governance reporting."}
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  const filters = parseGovernanceReportSearchParams(rawSearchParams);
  const exportRecipient = parseGovernanceReportExportRecipient(rawSearchParams);
  const view = parseGovernanceReportView(rawSearchParams);
  const [governanceSummary, governanceEvents, persistedCases] = await Promise.all([
    tryGetPersistedGovernanceSummary(),
    tryGetPersistedGovernanceEvents(filters),
    tryListPersistedCases()
  ]);
  const baseOperationalRiskSummary = buildGovernanceOperationalRiskSummary(persistedCases ?? []);
  const recentBatchScopes = baseOperationalRiskSummary.bulkBatches.map((batch) => ({
    batchId: batch.batchId,
    scope: buildRevenueManagerScope(persistedCases ?? [], {
      bulkBatchId: batch.batchId,
      queue: "escalated_handoffs"
    })
  }));
  const recentBatchCaseIds = [...new Set(recentBatchScopes.flatMap(({ scope }) => scope.focusedCases.map((caseItem) => caseItem.caseId)))];
  const recentBatchCaseDetails = new Map<string, PersistedCaseDetail>(
    (
      await Promise.all(
        recentBatchCaseIds.map(async (caseId) => {
          const caseDetail = await tryGetPersistedCaseDetail(caseId);

          return caseDetail ? ([caseId, caseDetail] as const) : null;
        })
      )
    ).flatMap((entry) => (entry ? [entry] : []))
  );

  const batchHistoryByBatchId = new Map<string, NonNullable<ReturnType<typeof buildRevenueManagerBatchHistory>>>();

  for (const { batchId, scope } of recentBatchScopes) {
    const batchHistory = buildRevenueManagerBatchHistory(
      scope,
      scope.focusedCases.flatMap((caseItem) => {
        const caseDetail = recentBatchCaseDetails.get(caseItem.caseId);

        return caseDetail ? [caseDetail] : [];
      })
    );

    if (batchHistory) {
      batchHistoryByBatchId.set(batchId, batchHistory);
    }
  }

  const operationalRiskSummary = buildGovernanceOperationalRiskSummary(persistedCases ?? [], {
    batchHistoryByBatchId
  });

  return (
    <ManagerGovernanceReport
      currentOperatorRole={currentOperatorRole}
      filters={filters}
      governanceEvents={governanceEvents}
      governanceSummary={governanceSummary}
      locale={locale}
      operationalRiskSummary={operationalRiskSummary}
      exportRecipient={exportRecipient}
      view={view}
    />
  );
}
