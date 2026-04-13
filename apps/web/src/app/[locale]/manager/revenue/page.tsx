import { canOperatorRoleAccessWorkspace, type SupportedLocale } from "@real-estate-ai/contracts";

import { ManagerWorkspaceUnavailable, RevenueManagerCommandCenter } from "@/components/manager-command-center";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function RevenueManagerPage(props: PageProps) {
  const { locale } = await props.params;
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole)) {
    return <ManagerWorkspaceUnavailable currentOperatorRole={currentOperatorRole} locale={locale} workspace="manager_revenue" />;
  }

  const persistedCases = await tryListPersistedCases();

  return <RevenueManagerCommandCenter currentOperatorRole={currentOperatorRole} locale={locale} persistedCases={persistedCases} />;
}
