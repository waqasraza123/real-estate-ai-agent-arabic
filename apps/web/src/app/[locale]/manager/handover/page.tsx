import { canOperatorRoleAccessWorkspace, type SupportedLocale } from "@real-estate-ai/contracts";

import { HandoverManagerCommandCenter, ManagerWorkspaceUnavailable } from "@/components/manager-command-center";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function HandoverManagerPage(props: PageProps) {
  const { locale } = await props.params;
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("manager_handover", currentOperatorRole)) {
    return <ManagerWorkspaceUnavailable currentOperatorRole={currentOperatorRole} locale={locale} workspace="manager_handover" />;
  }

  const persistedCases = await tryListPersistedCases();

  return <HandoverManagerCommandCenter currentOperatorRole={currentOperatorRole} locale={locale} persistedCases={persistedCases} />;
}
