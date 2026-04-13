import type { SupportedLocale } from "@real-estate-ai/contracts";

import { QaCommandCenter, QaWorkspaceUnavailable, canAccessQaWorkspace } from "@/components/qa-command-center";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function QaWorkspacePage(props: PageProps) {
  const { locale } = await props.params;
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canAccessQaWorkspace(currentOperatorRole)) {
    return <QaWorkspaceUnavailable currentOperatorRole={currentOperatorRole} locale={locale} />;
  }

  const persistedCases = await tryListPersistedCases();

  return <QaCommandCenter currentOperatorRole={currentOperatorRole} locale={locale} persistedCases={persistedCases} />;
}
