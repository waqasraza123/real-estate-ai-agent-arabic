import { notFound } from "next/navigation";

import Link from "next/link";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform } from "@real-estate-ai/contracts";
import { getDemoCaseById, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  twoColumnGridClassName,
  WorkflowPanelBody
} from "@real-estate-ai/ui";

import { CaseRouteTabs } from "@/components/case-route-tabs";
import { CaseManualReplyForm } from "@/components/case-manual-reply-form";
import { CaseReplyDraftQaRequestForm } from "@/components/case-reply-draft-qa-request-form";
import { MessageThread } from "@/components/message-thread";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { ReviewSummaryCard } from "@/components/review-summary-card";
import { ScreenIntro } from "@/components/screen-intro";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getCaseManualReplyCopy, getCaseReplyDraftQaRequestCopy } from "@/lib/live-copy";
import { getOperatorPermissionGuardNote } from "@/lib/operator-role";
import { getPreferredOperatorSurfacePath } from "@/lib/operator-role";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { buildCaseReferenceCode, buildPersistedConversation, getPersistedQaReviewDisplay } from "@/lib/persisted-case-presenters";
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
      <div className={pageStackClassName}>
        <ScreenIntro badge={messages.conversation.title} summary={messages.conversation.summary} title={messages.conversation.title} />
        <WorkspaceAccessPanel
          actionHref={getPreferredOperatorSurfacePath(locale, currentOperatorRole)}
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
    const qaReviewDisplay = getPersistedQaReviewDisplay(locale, persistedCase);
    const canManageQaSampling = canOperatorRolePerform("manage_qa_sampling", currentOperatorRole);
    const canSendReplies = canOperatorRolePerform("send_case_replies", currentOperatorRole);
    const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", currentOperatorRole);
    const canSendHumanReply = canSendReplies && persistedCase.automationHoldReason === null;
    const manualReplyCopy = getCaseManualReplyCopy(locale);
    const replyDraftCopy = getCaseReplyDraftQaRequestCopy(locale);
    const qaSamplingGuardNote = getOperatorPermissionGuardNote(locale, "manage_qa_sampling");
    const sendReplyGuardNote = getOperatorPermissionGuardNote(locale, "send_case_replies");
    const currentReplyDraft =
      qaReviewDisplay?.subjectType === "prepared_reply_draft"
        ? {
            draftMessage: qaReviewDisplay.draftMessage,
            reviewSummary: qaReviewDisplay.reviewSummary,
            sampleSummary: qaReviewDisplay.sampleSummary,
            status: qaReviewDisplay.status,
            statusLabel: qaReviewDisplay.statusLabel,
            statusTone: qaReviewDisplay.statusTone,
            subjectTypeLabel: qaReviewDisplay.subjectTypeLabel,
            triggerEvidence: qaReviewDisplay.triggerEvidence,
            triggerSourceLabel: qaReviewDisplay.triggerSourceLabel,
            updatedAt: qaReviewDisplay.updatedAt
          }
        : null;
    const approvedReplyDraftAlreadySent =
      qaReviewDisplay?.subjectType === "prepared_reply_draft" &&
      qaReviewDisplay.status === "approved" &&
      persistedCase.auditEvents.some(
        (event) =>
          event.eventType === "case_reply_sent" &&
          typeof event.payload?.approvedDraftQaReviewId === "string" &&
          event.payload.approvedDraftQaReviewId === qaReviewDisplay.qaReviewId
      );
    const hasApprovedReplyDraft = currentReplyDraft?.status === "approved" && !approvedReplyDraftAlreadySent;
    const replySendDisabledLabel = !canSendReplies
      ? sendReplyGuardNote
      : locale === "ar"
        ? "لا يمكن حفظ الرد بينما مراجعة الجودة الحالية ما زالت مفتوحة أو تطلب متابعة."
        : "A human reply cannot be saved while the current QA review is still open or requires follow-up.";

    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={buildCaseReferenceCode(persistedCase.caseId)} summary={messages.conversation.summary} title={messages.conversation.title} />
        <CaseRouteTabs caseId={persistedCase.caseId} handoverCaseId={persistedCase.handoverCase?.handoverCaseId} locale={locale} />

        {qaReviewDisplay ? (
          <Panel title={locale === "ar" ? "حالة التحكم البشري" : "Human takeover state"}>
            <WorkflowPanelBody className="mt-4">
              <ReviewSummaryCard
                badges={[
                  { label: qaReviewDisplay.statusLabel, tone: qaReviewDisplay.statusTone },
                  { label: qaReviewDisplay.subjectTypeLabel },
                  { label: qaReviewDisplay.triggerSourceLabel },
                  ...qaReviewDisplay.policySignalLabels.map((label) => ({ label }))
                ]}
                meta={qaReviewDisplay.draftMessage ? <p className={caseMetaClassName}>{qaReviewDisplay.draftMessage}</p> : null}
                summary={qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}
                title={locale === "ar" ? "بوابة التحكم الحالية" : "Current takeover gate"}
                tone="warning"
              />
            </WorkflowPanelBody>
          </Panel>
        ) : null}

        <div className={twoColumnGridClassName}>
          <Panel title={manualReplyCopy.title}>
            <WorkflowPanelBody className="mt-4" note={!canSendReplies ? sendReplyGuardNote : undefined} summary={manualReplyCopy.summary}>
              <CaseManualReplyForm
                canSend={canSendHumanReply}
                caseId={persistedCase.caseId}
                defaultMessage={hasApprovedReplyDraft ? currentReplyDraft?.draftMessage : null}
                defaultNextAction={persistedCase.nextAction}
                defaultNextActionDueAt={persistedCase.nextActionDueAt}
                defaultSentByName={persistedCase.ownerName}
                disabledLabel={replySendDisabledLabel}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}/conversation`}
                showApprovedDraftNote={hasApprovedReplyDraft}
              />
            </WorkflowPanelBody>
          </Panel>

          <Panel title={replyDraftCopy.title}>
            <WorkflowPanelBody className="mt-4" note={qaSamplingGuardNote} summary={replyDraftCopy.summary}>
              <CaseReplyDraftQaRequestForm
                canManage={canManageQaSampling && qaReviewDisplay?.status !== "pending_review"}
                caseId={persistedCase.caseId}
                defaultDraftMessage={currentReplyDraft?.draftMessage ?? null}
                defaultRequestedByName={persistedCase.ownerName}
                disabledLabel={locale === "ar" ? "يتطلب دوراً مخولاً للجودة" : "QA sampling role required"}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}/conversation`}
              />
            </WorkflowPanelBody>
          </Panel>

          <Panel title={locale === "ar" ? "حالة مسودة الرد" : "Reply-draft state"}>
            {currentReplyDraft ? (
              <WorkflowPanelBody className="mt-4">
                <ReviewSummaryCard
                  actions={
                    canAccessQaWorkspace ? (
                      <Link className={inlineLinkClassName} href={`/${locale}/qa/cases/${persistedCase.caseId}`}>
                        {locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    ) : null
                  }
                  badges={[
                    { label: currentReplyDraft.statusLabel, tone: currentReplyDraft.statusTone },
                    { label: currentReplyDraft.triggerSourceLabel },
                    ...(qaReviewDisplay?.policySignalLabels.map((label) => ({ label })) ?? [])
                  ]}
                  meta={<p className={caseMetaClassName}>{currentReplyDraft.updatedAt}</p>}
                  summary={currentReplyDraft.reviewSummary ?? currentReplyDraft.sampleSummary}
                  title={currentReplyDraft.subjectTypeLabel}
                >
                  <p className="text-sm leading-7 text-ink-soft">{currentReplyDraft.draftMessage}</p>
                  {currentReplyDraft.triggerEvidence.length > 0 ? <p className={caseMetaClassName}>{currentReplyDraft.triggerEvidence.join(", ")}</p> : null}
                </ReviewSummaryCard>
              </WorkflowPanelBody>
            ) : (
              <WorkflowPanelBody
                summary={
                  locale === "ar"
                    ? "لا توجد حالياً مسودة رد محفوظة داخل حدود اعتماد الجودة."
                    : "No prepared reply draft is currently sitting inside the QA approval boundary."
                }
              />
            )}
          </Panel>
        </div>

        <Panel title={persistedCase.customerName}>
          <MessageThread locale={locale} messages={buildPersistedConversation(persistedCase, locale)} />
        </Panel>
      </div>
    );
  }

  const caseItem = getDemoCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={caseItem.referenceCode} summary={messages.conversation.summary} title={messages.conversation.title} />
      <CaseRouteTabs caseId={caseItem.id} handoverCaseId={caseItem.handoverCaseId} locale={locale} />

      <Panel title={caseItem.customerName}>
        <MessageThread locale={locale} messages={caseItem.conversation} />
      </Panel>

      <PlaceholderNotice locale={locale} />
    </div>
  );
}
