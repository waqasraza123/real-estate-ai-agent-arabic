import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { MessageThread } from "@/components/message-thread";
import { QaReviewResolutionForm } from "@/components/qa-review-resolution-form";
import { QaWorkspaceUnavailable } from "@/components/qa-command-center";
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
  const qaReviewHistory = getPersistedQaReviewHistory(locale, persistedCase);
  const resolutionCopy = getQaReviewResolutionCopy(locale);
  const canManageQaReview = canOperatorRolePerform("manage_qa_reviews", currentOperatorRole);
  const qaGuardNote = getOperatorPermissionGuardNote(locale, "manage_qa_reviews");
  const canAccessSalesWorkspace = canOperatorRoleAccessWorkspace("sales", currentOperatorRole);

  return (
    <div className="page-stack">
      <ScreenIntro
        badge={buildCaseReferenceCode(persistedCase.caseId)}
        summary={locale === "ar" ? "سجل مراجعة الجودة للحالة الحية." : "QA review record for the live case."}
        title={locale === "ar" ? "تفاصيل مراجعة الجودة" : "QA case detail"}
      />

      <div className="two-column-grid">
        <Panel title={persistedCase.customerName}>
          <div className="detail-grid">
            <div>
              <p className="detail-label">{locale === "ar" ? "مرحلة الحالة" : "Case stage"}</p>
              <StatusBadge>{getPersistedCaseStageLabel(locale, persistedCase.stage)}</StatusBadge>
            </div>
            <div>
              <p className="detail-label">{locale === "ar" ? "الحالة الحالية" : "Current state"}</p>
              <StatusBadge tone={currentQaReview?.statusTone ?? "warning"}>
                {currentQaReview?.statusLabel ?? (locale === "ar" ? "لا توجد مراجعة" : "No QA review")}
              </StatusBadge>
            </div>
            <div>
              <p className="detail-label">{locale === "ar" ? "المالك الحالي" : "Current owner"}</p>
              <p>{persistedCase.ownerName}</p>
            </div>
            <div>
              <p className="detail-label">{locale === "ar" ? "متابعة الحالة" : "Follow-up health"}</p>
              <p>{getPersistedFollowUpLabel(locale, persistedCase)}</p>
            </div>
            <div>
              <p className="detail-label">{locale === "ar" ? "آخر تغيير" : "Last change"}</p>
              <p>{formatCaseLastChange(persistedCase, locale)}</p>
            </div>
            <div>
              <p className="detail-label">{locale === "ar" ? "المشروع" : "Project"}</p>
              <p>{persistedCase.projectInterest}</p>
            </div>
          </div>
          <div className="status-row-wrap">
            {currentQaReview ? (
              <>
                <StatusBadge tone={currentQaReview.statusTone}>{currentQaReview.statusLabel}</StatusBadge>
                <StatusBadge>{currentQaReview.requestedByName}</StatusBadge>
              </>
            ) : null}
          </div>
          {canAccessSalesWorkspace ? (
            <Link className="inline-link" href={`/${locale}/leads/${persistedCase.caseId}`}>
              {locale === "ar" ? "فتح ملف الحالة الكامل" : "Open full case profile"}
            </Link>
          ) : null}
        </Panel>

        <Panel title={locale === "ar" ? "ملخص العينة الحالية" : "Current sample summary"}>
          {currentQaReview ? (
            <div className="page-stack">
              <p>{currentQaReview.sampleSummary}</p>
              <dl className="detail-list">
                <div>
                  <dt>{locale === "ar" ? "الجهة الطالبة" : "Requested by"}</dt>
                  <dd>{currentQaReview.requestedByName}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "آخر تحديث" : "Last updated"}</dt>
                  <dd>{currentQaReview.updatedAt}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "قرار المراجع" : "Reviewer decision"}</dt>
                  <dd>{currentQaReview.reviewSummary ?? "—"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="panel-summary">
              {locale === "ar" ? "لا توجد مراجعة جودة مسجلة على هذه الحالة." : "No QA review has been recorded for this case."}
            </p>
          )}
        </Panel>
      </div>

      <div className="two-column-grid">
        <Panel title={locale === "ar" ? "سياق المحادثة الحية" : "Live conversation context"}>
          <MessageThread locale={locale} messages={buildPersistedConversation(persistedCase)} />
        </Panel>

        <Panel title={resolutionCopy.title}>
          <p className="panel-summary">{resolutionCopy.summary}</p>
          <p className="field-note">{qaGuardNote}</p>
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
              <div className="page-stack">
                <StatusBadge tone={currentQaReview.statusTone}>{currentQaReview.statusLabel}</StatusBadge>
                <p>{currentQaReview.reviewSummary ?? currentQaReview.sampleSummary}</p>
                <p className="case-link-meta">{currentQaReview.reviewedAt ?? currentQaReview.updatedAt}</p>
              </div>
            )
          ) : (
            <p className="panel-summary">
              {locale === "ar"
                ? "لا يوجد عنصر جودة مفتوح لهذه الحالة حالياً."
                : "There is no open QA item on this case right now."}
            </p>
          )}
        </Panel>
      </div>

      <Panel title={locale === "ar" ? "سجل مراجعات الجودة" : "QA review history"}>
        <StatefulStack
          emptySummary={
            locale === "ar"
              ? "لم يتم حفظ أي قرارات جودة لهذه الحالة بعد."
              : "No QA decisions have been saved for this case yet."
          }
          emptyTitle={locale === "ar" ? "لا يوجد سجل جودة" : "No QA history yet"}
          items={qaReviewHistory}
          renderItem={(qaReview) => (
            <article key={qaReview.qaReviewId} className="intervention-row">
              <div className="row-between">
                <h3>{qaReview.sampleSummary}</h3>
                <StatusBadge tone={qaReview.statusTone}>{qaReview.statusLabel}</StatusBadge>
              </div>
              <p>{qaReview.reviewSummary ?? "—"}</p>
              <p className="case-link-meta">
                {qaReview.reviewerName ?? qaReview.requestedByName}
                {" · "}
                {qaReview.reviewedAt ?? qaReview.createdAt}
              </p>
            </article>
          )}
        />
      </Panel>

      <TimelinePanel events={buildPersistedTimeline(persistedCase)} locale={locale} />
    </div>
  );
}
