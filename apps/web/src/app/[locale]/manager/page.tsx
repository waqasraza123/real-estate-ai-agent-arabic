import { canOperatorRoleAccessWorkspace, type SupportedLocale } from "@real-estate-ai/contracts";
import { getMessages } from "@real-estate-ai/i18n";

import { redirect } from "next/navigation";

import { ManagerWorkspaceGateway } from "@/components/manager-command-center";
import { ScreenIntro } from "@/components/screen-intro";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getDefaultManagerPath } from "@/lib/manager-workspace";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function ManagerPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();
  const canAccessRevenueManagerWorkspace = canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", currentOperatorRole);

  if (!canAccessRevenueManagerWorkspace && !canAccessHandoverManagerWorkspace) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={messages.app.phaseLabel} summary={messages.manager.summary} title={messages.manager.title} />
        <WorkspaceAccessPanel
          actionHref={`/${locale}/dashboard`}
          actionLabel={locale === "ar" ? "العودة إلى اللوحة" : "Return to the dashboard"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "مدخل الإدارة مخصص للأدوار التي تملك قيادة الإيرادات أو قيادة التسليم في وضع الجلسة المحلي الموثوق."
              : "The manager entry is reserved for roles that own the revenue or handover command surfaces in trusted local session mode."
          }
          title={locale === "ar" ? "مركز القيادة غير متاح لهذا الدور" : "Command center unavailable for this role"}
          workspace="manager_handover"
        />
      </div>
    );
  }

  if (canAccessRevenueManagerWorkspace !== canAccessHandoverManagerWorkspace) {
    redirect(getDefaultManagerPath(locale, currentOperatorRole));
  }

  const persistedCases = await tryListPersistedCases();

  return <ManagerWorkspaceGateway currentOperatorRole={currentOperatorRole} locale={locale} persistedCases={persistedCases} />;
}
