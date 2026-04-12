import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace } from "@real-estate-ai/contracts";
import { getDemoCaseById, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel } from "@real-estate-ai/ui";

import { CaseRouteTabs } from "@/components/case-route-tabs";
import { MessageThread } from "@/components/message-thread";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { ScreenIntro } from "@/components/screen-intro";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { buildCaseReferenceCode, buildPersistedConversation } from "@/lib/persisted-case-presenters";
import { tryGetPersistedCaseDetail } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; caseId: string }>;
}

export default async function ConversationPage(props: PageProps) {
  const { locale, caseId } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("sales", currentOperatorRole)) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={messages.conversation.title} summary={messages.conversation.summary} title={messages.conversation.title} />
        <WorkspaceAccessPanel
          actionHref={`/${locale}/manager`}
          actionLabel={locale === "ar" ? "العودة إلى السطح المتاح" : "Return to an allowed surface"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "وحدة المحادثة الحية مقيدة بمساحة المبيعات في وضع الجلسة المحلي الموثوق."
              : "The live conversation console is restricted to the sales workspace in trusted local session mode."
          }
          title={locale === "ar" ? "مساحة المبيعات مطلوبة" : "Sales workspace required"}
          workspace="sales"
        />
      </div>
    );
  }

  const persistedCase = await tryGetPersistedCaseDetail(caseId);

  if (persistedCase) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={buildCaseReferenceCode(persistedCase.caseId)} summary={messages.conversation.summary} title={messages.conversation.title} />
        <CaseRouteTabs caseId={persistedCase.caseId} handoverCaseId={persistedCase.handoverCase?.handoverCaseId} locale={locale} />

        <Panel title={persistedCase.customerName}>
          <MessageThread locale={locale} messages={buildPersistedConversation(persistedCase)} />
        </Panel>
      </div>
    );
  }

  const caseItem = getDemoCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return (
    <div className="page-stack">
      <ScreenIntro badge={caseItem.referenceCode} summary={messages.conversation.summary} title={messages.conversation.title} />
      <CaseRouteTabs caseId={caseItem.id} handoverCaseId={caseItem.handoverCaseId} locale={locale} />

      <Panel title={caseItem.customerName}>
        <MessageThread locale={locale} messages={caseItem.conversation} />
      </Panel>

      <PlaceholderNotice locale={locale} />
    </div>
  );
}
