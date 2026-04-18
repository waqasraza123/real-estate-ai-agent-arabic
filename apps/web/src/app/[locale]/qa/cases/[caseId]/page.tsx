import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import {
  ActivityFeed,
  caseMetaClassName,
  DetailGrid,
  DetailItem,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  panelSummaryClassName,
  StatusBadge,
  statusRowWrapClassName,
  twoColumnGridClassName,
  WorkflowPanelBody
} from "@real-estate-ai/ui";

import { HandoverCustomerUpdateQaReviewForm } from "@/components/handover-customer-update-qa-review-form";
import { MessageThread } from "@/components/message-thread";
import { QaReviewResolutionForm } from "@/components/qa-review-resolution-form";
import { QaWorkspaceUnavailable } from "@/components/qa-command-center";
import { ReviewSummaryCard } from "@/components/review-summary-card";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { TimelinePanel } from "@/components/timeline-panel";
import { getQaReviewResolutionCopy } from "@/lib/live-copy";
import { tryGetPersistedCaseDetail } from "@/lib/live-api";
import { getOperatorPermissionGuardNote } from "@/lib/operator-role";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import {
  buildCaseReferenceCode,
  buildPersistedConversation,
  buildPersistedTimeline,
  formatCaseLastChange,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverCustomerUpdateQaReviewDisplay,
  getPersistedQaReviewDisplay,
  getPersistedQaReviewHistory
} from "@/lib/persisted-case-presenters";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; caseId: string }>;
}

export default async function QaCaseDetailPage(props: PageProps) {
  const { locale, caseId } = await props.params;
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("qa", currentOperatorRole)) {
    return <QaWorkspaceUnavailable currentOperatorRole={currentOperatorRole} locale={locale} />;
  }

  const persistedCase = await tryGetPersistedCaseDetail(caseId);

  if (!persistedCase) {
    notFound();
  }

  const currentQaReview = getPersistedQaReviewDisplay(locale, persistedCase);
  const currentCustomerUpdateQaReview = getPersistedHandoverCustomerUpdateQaReviewDisplay(locale, persistedCase);
  const qaReviewHistory = getPersistedQaReviewHistory(locale, persistedCase);
  const resolutionCopy = getQaReviewResolutionCopy(locale);
  const canManageQaReview = canOperatorRolePerform("manage_qa_reviews", currentOperatorRole);
  const qaGuardNote = getOperatorPermissionGuardNote(locale, "manage_qa_reviews");
  const canAccessSalesWorkspace = canOperatorRoleAccessWorkspace("sales", currentOperatorRole);

  return (
    <div className={pageStackClassName}>
      <ScreenIntro
        badge={buildCaseReferenceCode(persistedCase.caseId)}
        summary={locale === "ar" ? "سجل مراجعة الجودة للحالة الحية." : "QA review record for the live case."}
        title={locale === "ar" ? "تفاصيل مراجعة الجودة" : "QA case detail"}
      />

      <div className={twoColumnGridClassName}>
        <Panel title={persistedCase.customerName}>
          <DetailGrid>
            <DetailItem
              label={locale === "ar" ? "مرحلة الحالة" : "Case stage"}
              value={<StatusBadge>{getPersistedCaseStageLabel(locale, persistedCase.stage)}</StatusBadge>}
            />
            <DetailItem
              label={locale === "ar" ? "الحالة الحالية" : "Current state"}
              value={
                <StatusBadge tone={currentQaReview?.statusTone ?? currentCustomerUpdateQaReview?.reviewStatusTone ?? "warning"}>
                  {currentQaReview?.statusLabel ??
                    currentCustomerUpdateQaReview?.reviewStatusLabel ??
                    (locale === "ar" ? "لا توجد مراجعة" : "No QA review")}
                </StatusBadge>
              }
            />
            <DetailItem label={locale === "ar" ? "المالك الحالي" : "Current owner"} value={persistedCase.ownerName} />
            <DetailItem label={locale === "ar" ? "متابعة الحالة" : "Follow-up health"} value={getPersistedFollowUpLabel(locale, persistedCase)} />
            <DetailItem label={locale === "ar" ? "آخر تغيير" : "Last change"} value={formatCaseLastChange(persistedCase, locale)} />
            <DetailItem label={locale === "ar" ? "المشروع" : "Project"} value={persistedCase.projectInterest} />
          </DetailGrid>
          <div className={`mt-5 ${statusRowWrapClassName}`}>
            {currentQaReview ? (
              <>
                <StatusBadge tone={currentQaReview.statusTone}>{currentQaReview.statusLabel}</StatusBadge>
                <StatusBadge>{currentQaReview.requestedByName}</StatusBadge>
              </>
            ) : null}
            {currentCustomerUpdateQaReview ? (
              <>
                <StatusBadge tone={currentCustomerUpdateQaReview.reviewStatusTone}>
                  {currentCustomerUpdateQaReview.reviewStatusLabel}
                </StatusBadge>
                <StatusBadge>{currentCustomerUpdateQaReview.typeLabel}</StatusBadge>
              </>
            ) : null}
          </div>
          {canAccessSalesWorkspace ? (
            <Link className={`mt-4 ${inlineLinkClassName}`} href={`/${locale}/leads/${persistedCase.caseId}`}>
              {locale === "ar" ? "فتح ملف الحالة الكامل" : "Open full case profile"}
            </Link>
          ) : null}
        </Panel>

        <Panel title={locale === "ar" ? "عناصر الجودة الحالية" : "Current QA items"}>
          <WorkflowPanelBody className="mt-4">
            {currentQaReview || currentCustomerUpdateQaReview ? (
              <ActivityFeed>
                {currentQaReview ? (
                  <ReviewSummaryCard
                    badges={[
                      { label: currentQaReview.statusLabel, tone: currentQaReview.statusTone },
                      { label: currentQaReview.subjectTypeLabel },
                      { label: currentQaReview.triggerSourceLabel },
                      ...currentQaReview.policySignalLabels.map((label) => ({ label }))
                    ]}
                    details={[
                      ...(currentQaReview.draftMessage
                        ? [{ label: locale === "ar" ? "الرد المجهز" : "Prepared reply draft", value: currentQaReview.draftMessage }]
                        : []),
                      { label: locale === "ar" ? "الجهة الطالبة" : "Requested by", value: currentQaReview.requestedByName },
                      {
                        label: locale === "ar" ? "الأدلة المطابقة" : "Matched evidence",
                        value: currentQaReview.triggerEvidence.length > 0 ? currentQaReview.triggerEvidence.join(", ") : "—"
                      },
                      { label: locale === "ar" ? "آخر تحديث" : "Last updated", value: currentQaReview.updatedAt },
                      { label: locale === "ar" ? "قرار المراجع" : "Reviewer decision", value: currentQaReview.reviewSummary ?? "—" }
                    ]}
                    summary={currentQaReview.sampleSummary}
                    title={currentQaReview.subjectTypeLabel}
                    tone="warning"
                  />
                ) : null}
                {currentCustomerUpdateQaReview ? (
                  <ReviewSummaryCard
                    badges={[
                      { label: currentCustomerUpdateQaReview.reviewStatusLabel, tone: currentCustomerUpdateQaReview.reviewStatusTone },
                      { label: currentCustomerUpdateQaReview.typeLabel },
                      ...currentCustomerUpdateQaReview.policySignalLabels.map((label) => ({ label }))
                    ]}
                    details={[
                      { label: locale === "ar" ? "المسودة المجهزة" : "Prepared draft", value: currentCustomerUpdateQaReview.deliverySummary ?? "—" },
                      {
                        label: locale === "ar" ? "الأدلة المطابقة" : "Matched evidence",
                        value: currentCustomerUpdateQaReview.triggerEvidence.length > 0 ? currentCustomerUpdateQaReview.triggerEvidence.join(", ") : "—"
                      },
                      { label: locale === "ar" ? "آخر تحديث" : "Last updated", value: currentCustomerUpdateQaReview.updatedAt },
                      { label: locale === "ar" ? "قرار المراجع" : "Reviewer decision", value: currentCustomerUpdateQaReview.reviewSummary ?? "—" }
                    ]}
                    summary={currentCustomerUpdateQaReview.reviewSampleSummary}
                    title={locale === "ar" ? "مراجعة مسودة تحديث العميل" : "Customer-update draft review"}
                    tone="warning"
                  />
                ) : null}
              </ActivityFeed>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar" ? "لا توجد مراجعة جودة مسجلة على هذه الحالة." : "No QA review has been recorded for this case."}
              </p>
            )}
          </WorkflowPanelBody>
        </Panel>
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={locale === "ar" ? "سياق المحادثة الحية" : "Live conversation context"}>
          <MessageThread locale={locale} messages={buildPersistedConversation(persistedCase, locale)} />
        </Panel>

        <Panel title={resolutionCopy.title}>
          <WorkflowPanelBody className="mt-4" note={qaGuardNote} summary={resolutionCopy.summary}>
            {currentQaReview || currentCustomerUpdateQaReview ? (
              <ActivityFeed>
                {currentQaReview ? (
                  currentQaReview.status === "pending_review" ? (
                    <QaReviewResolutionForm
                      canManage={canManageQaReview}
                      caseId={persistedCase.caseId}
                      currentStatus={currentQaReview.status}
                      defaultReviewerName={locale === "ar" ? "فريق الجودة" : "QA Team"}
                      disabledLabel={locale === "ar" ? "يتطلب مراجع جودة" : "QA reviewer required"}
                      locale={locale}
                      qaReviewId={currentQaReview.qaReviewId}
                      returnPath={`/${locale}/qa/cases/${persistedCase.caseId}`}
                    />
                  ) : (
                    <ReviewSummaryCard
                      badges={[
                        { label: currentQaReview.statusLabel, tone: currentQaReview.statusTone },
                        { label: currentQaReview.subjectTypeLabel },
                        { label: currentQaReview.triggerSourceLabel },
                        ...currentQaReview.policySignalLabels.map((label) => ({ label }))
                      ]}
                      meta={<p className={caseMetaClassName}>{currentQaReview.reviewedAt ?? currentQaReview.updatedAt}</p>}
                      summary={currentQaReview.reviewSummary ?? currentQaReview.sampleSummary}
                      title={currentQaReview.subjectTypeLabel}
                      tone={currentQaReview.statusTone}
                    >
                      {currentQaReview.draftMessage ? <p className="text-sm leading-7 text-ink-soft">{currentQaReview.draftMessage}</p> : null}
                    </ReviewSummaryCard>
                  )
                ) : null}
                {currentCustomerUpdateQaReview ? (
                  currentCustomerUpdateQaReview.reviewStatus === "pending_review" ? (
                    <ReviewSummaryCard
                      summary={
                        locale === "ar"
                          ? "احسم قرار الجودة قبل السماح بمتابعة تحديث العميل المجهز."
                          : "Resolve QA before the prepared customer update can proceed."
                      }
                      title={locale === "ar" ? "قرار مسودة تحديث العميل" : "Customer-update draft decision"}
                      tone="warning"
                    >
                      <HandoverCustomerUpdateQaReviewForm
                        canManage={canManageQaReview}
                        customerUpdateId={currentCustomerUpdateQaReview.customerUpdateId}
                        defaultReviewerName={locale === "ar" ? "فريق الجودة" : "QA Team"}
                        disabledLabel={locale === "ar" ? "يتطلب مراجع جودة" : "QA reviewer required"}
                        handoverCaseId={currentCustomerUpdateQaReview.handoverCaseId}
                        locale={locale}
                        returnPath={`/${locale}/qa/cases/${persistedCase.caseId}`}
                      />
                    </ReviewSummaryCard>
                  ) : (
                    <ReviewSummaryCard
                      badges={[
                        { label: currentCustomerUpdateQaReview.reviewStatusLabel, tone: currentCustomerUpdateQaReview.reviewStatusTone },
                        { label: currentCustomerUpdateQaReview.typeLabel },
                        ...currentCustomerUpdateQaReview.policySignalLabels.map((label) => ({ label }))
                      ]}
                      meta={<p className={caseMetaClassName}>{currentCustomerUpdateQaReview.reviewedAt ?? currentCustomerUpdateQaReview.updatedAt}</p>}
                      summary={currentCustomerUpdateQaReview.reviewSummary ?? currentCustomerUpdateQaReview.reviewSampleSummary}
                      title={locale === "ar" ? "قرار مسودة تحديث العميل" : "Customer-update draft decision"}
                      tone={currentCustomerUpdateQaReview.reviewStatusTone}
                    />
                  )
                ) : null}
              </ActivityFeed>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "لا يوجد عنصر جودة مفتوح لهذه الحالة حالياً."
                  : "There is no open QA item on this case right now."}
              </p>
            )}
          </WorkflowPanelBody>
        </Panel>
      </div>

      <Panel title={locale === "ar" ? "سجل مراجعات الجودة" : "QA review history"}>
        <WorkflowPanelBody className="mt-4">
          <StatefulStack
            className="flex flex-col gap-4"
            emptySummary={
              locale === "ar"
                ? "لم يتم حفظ أي قرارات جودة لهذه الحالة بعد."
                : "No QA decisions have been saved for this case yet."
            }
            emptyTitle={locale === "ar" ? "لا يوجد سجل جودة" : "No QA history yet"}
            items={qaReviewHistory}
            renderItem={(qaReview) => (
              <ReviewSummaryCard
                key={qaReview.qaReviewId}
                badges={[
                  { label: qaReview.statusLabel, tone: qaReview.statusTone },
                  { label: qaReview.subjectTypeLabel },
                  { label: qaReview.triggerSourceLabel },
                  ...qaReview.policySignalLabels.map((label) => ({ label }))
                ]}
                meta={
                  <p className={caseMetaClassName}>
                    {qaReview.reviewerName ?? qaReview.requestedByName}
                    {" · "}
                    {qaReview.reviewedAt ?? qaReview.createdAt}
                  </p>
                }
                summary={qaReview.reviewSummary ?? "—"}
                title={qaReview.subjectTypeLabel}
                tone={qaReview.statusTone}
              >
                {qaReview.draftMessage ? <p className="text-sm leading-7 text-ink-soft">{qaReview.draftMessage}</p> : null}
              </ReviewSummaryCard>
            )}
          />
        </WorkflowPanelBody>
      </Panel>

      <TimelinePanel events={buildPersistedTimeline(persistedCase, locale)} locale={locale} />
    </div>
  );
}
