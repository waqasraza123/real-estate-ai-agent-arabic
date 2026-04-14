import { canOperatorRoleAccessWorkspace, type SupportedLocale } from "@real-estate-ai/contracts";
import { Panel } from "@real-estate-ai/ui";

import { ManagerGovernanceReport } from "@/components/manager-governance-report";
import { ScreenIntro } from "@/components/screen-intro";
import { parseGovernanceReportSearchParams, parseGovernanceReportView } from "@/lib/governance-report";
import { tryGetPersistedGovernanceEvents, tryGetPersistedGovernanceSummary, tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

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
      <div className="page-stack">
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
          <div className="page-stack">
            <p className="panel-summary">
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
  const view = parseGovernanceReportView(rawSearchParams);
  const [governanceSummary, governanceEvents, persistedCases] = await Promise.all([
    tryGetPersistedGovernanceSummary(),
    tryGetPersistedGovernanceEvents(filters),
    tryListPersistedCases()
  ]);

  return (
    <ManagerGovernanceReport
      currentOperatorRole={currentOperatorRole}
      filters={filters}
      governanceEvents={governanceEvents}
      governanceSummary={governanceSummary}
      locale={locale}
      persistedCases={persistedCases ?? []}
      view={view}
    />
  );
}
