import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { getDemoCaseById, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { AutomationStatusForm } from "@/components/automation-status-form";
import { CaseRouteTabs } from "@/components/case-route-tabs";
import { ManagerFollowUpForm } from "@/components/manager-follow-up-form";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { QaReviewRequestForm } from "@/components/qa-review-request-form";
import { QualificationForm } from "@/components/qualification-form";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { TimelinePanel } from "@/components/timeline-panel";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getOperatorPermissionGuardNote, getPreferredOperatorSurfacePath } from "@/lib/operator-role";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import {
  buildCaseReferenceCode,
  buildPersistedTimeline,
  formatCaseLastChange,
  formatDueAt,
  getPersistedAutomationLabel,
  getPersistedAutomationHoldReasonLabel,
  getPersistedAutomationHoldReasonNote,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverStatusLabel,
  getPersistedInterventionDisplay,
  getPersistedQaReviewDisplay,
  getPersistedQualificationSummary,
  getPersistedSourceLabel
} from "@/lib/persisted-case-presenters";
import { getAutomationStatusCopy, getFollowUpManagerCopy, getInterventionCountLabel, getQaReviewRequestCopy } from "@/lib/live-copy";
import { tryGetPersistedCaseDetail } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; caseId: string }>;
}

export default async function LeadProfilePage(props: PageProps) {
  const { locale, caseId } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("sales", currentOperatorRole)) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={messages.profile.title} summary={messages.profile.summary} title={messages.profile.title} />
        <WorkspaceAccessPanel
          actionHref={getPreferredOperatorSurfacePath(locale, currentOperatorRole)}
          actionLabel={locale === "ar" ? "فتح السطح المتاح" : "Open an available surface"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "ملفات العملاء الحية تظل ضمن مساحة المبيعات المحلية. يمكن لدورك الحالي متابعة العمل عبر مركز القيادة أو سجل التسليم المرتبط."
              : "Live lead profiles remain inside the local sales workspace. Your current role can continue through the command center or the linked handover record instead."
          }
          title={locale === "ar" ? "ملف العميل غير متاح لهذا الدور" : "Lead profile unavailable for this role"}
          workspace="sales"
        />
      </div>
    );
  }

  const persistedCase = await tryGetPersistedCaseDetail(caseId);

  if (persistedCase) {
    const qualificationSummary = getPersistedQualificationSummary(locale, persistedCase);
    const interventionItems = getPersistedInterventionDisplay(locale, persistedCase);
    const automationCopy = getAutomationStatusCopy(locale);
    const followUpManagerCopy = getFollowUpManagerCopy(locale);
    const canManageFollowUp = canOperatorRolePerform("manage_case_follow_up", currentOperatorRole);
    const canManageAutomation = canOperatorRolePerform("manage_case_automation", currentOperatorRole);
    const canManageQaSampling = canOperatorRolePerform("manage_qa_sampling", currentOperatorRole);
    const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", currentOperatorRole);
    const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", currentOperatorRole);
    const followUpGuardNote = getOperatorPermissionGuardNote(locale, "manage_case_follow_up");
    const automationGuardNote = getOperatorPermissionGuardNote(locale, "manage_case_automation");
    const qaSamplingGuardNote = getOperatorPermissionGuardNote(locale, "manage_qa_sampling");
    const qaReviewDisplay = getPersistedQaReviewDisplay(locale, persistedCase);
    const qaReviewRequestCopy = getQaReviewRequestCopy(locale);
    const automationHoldReasonLabel = getPersistedAutomationHoldReasonLabel(locale, persistedCase.automationHoldReason);
    const automationHoldReasonNote = getPersistedAutomationHoldReasonNote(
      locale,
      persistedCase.automationStatus,
      persistedCase.automationHoldReason
    );

    return (
      <div className="page-stack">
        <ScreenIntro badge={buildCaseReferenceCode(persistedCase.caseId)} summary={persistedCase.message} title={messages.profile.title} />
        <CaseRouteTabs caseId={persistedCase.caseId} handoverCaseId={persistedCase.handoverCase?.handoverCaseId} locale={locale} />

        <div className="two-column-grid">
          <Panel title={persistedCase.customerName}>
            <div className="detail-grid">
              <div>
                <p className="detail-label">{messages.common.stage}</p>
                <StatusBadge>{getPersistedCaseStageLabel(locale, persistedCase.stage)}</StatusBadge>
              </div>
              <div>
                <p className="detail-label">{messages.common.currentOwner}</p>
                <p>{persistedCase.ownerName}</p>
              </div>
              <div>
                <p className="detail-label">{messages.common.nextAction}</p>
                <p>{persistedCase.nextAction}</p>
              </div>
              <div>
                <p className="detail-label">{locale === "ar" ? "موعد المتابعة" : "Follow-up due"}</p>
                <p>{formatDueAt(persistedCase, locale)}</p>
              </div>
              <div>
                <p className="detail-label">{messages.common.lastChange}</p>
                <p>{formatCaseLastChange(persistedCase, locale)}</p>
              </div>
              <div>
                <p className="detail-label">{locale === "ar" ? "مصدر الحالة" : "Lead source"}</p>
                <p>{getPersistedSourceLabel(locale)}</p>
              </div>
            </div>
            <div className="status-row-wrap">
              <StatusBadge tone={persistedCase.followUpStatus === "attention" ? "critical" : "success"}>
                {getPersistedFollowUpLabel(locale, persistedCase)}
              </StatusBadge>
              <StatusBadge>{getPersistedAutomationLabel(locale, persistedCase.automationStatus)}</StatusBadge>
              {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
              {persistedCase.openInterventionsCount > 0 ? (
                <StatusBadge tone="warning">{getInterventionCountLabel(locale, persistedCase.openInterventionsCount)}</StatusBadge>
              ) : null}
            </div>
            <div className="case-callout">
              <p>{persistedCase.budget ?? persistedCase.projectInterest}</p>
              <p>{persistedCase.projectInterest}</p>
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "التفاصيل الأساسية" : "Core intake details"}>
            <dl className="detail-list">
              <div>
                <dt>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</dt>
                <dd>{persistedCase.email}</dd>
              </div>
              <div>
                <dt>{locale === "ar" ? "الهاتف" : "Phone"}</dt>
                <dd>{persistedCase.phone ?? "—"}</dd>
              </div>
              <div>
                <dt>{locale === "ar" ? "المشروع المطلوب" : "Project interest"}</dt>
                <dd>{persistedCase.projectInterest}</dd>
              </div>
              <div>
                <dt>{locale === "ar" ? "لغة العميل" : "Customer language"}</dt>
                <dd>{persistedCase.preferredLocale === "ar" ? "العربية" : "English"}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={followUpManagerCopy.title}>
            <p className="panel-summary">{followUpManagerCopy.summary}</p>
            <p className="field-note">{followUpGuardNote}</p>
            <ManagerFollowUpForm
              canManage={canManageFollowUp}
              caseId={persistedCase.caseId}
              disabledLabel={locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
              locale={locale}
              nextAction={persistedCase.nextAction}
              nextActionDueAt={persistedCase.nextActionDueAt}
              ownerName={persistedCase.ownerName}
              returnPath={`/${locale}/leads/${persistedCase.caseId}`}
            />
          </Panel>

          <Panel title={automationCopy.title}>
            <p className="panel-summary">{automationCopy.summary}</p>
            <p className="field-note">{automationGuardNote}</p>
            {automationHoldReasonNote ? <p className="field-note">{automationHoldReasonNote}</p> : null}
            <AutomationStatusForm
              canManage={canManageAutomation}
              caseId={persistedCase.caseId}
              disabledLabel={locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
              locale={locale}
              returnPath={`/${locale}/leads/${persistedCase.caseId}`}
              status={persistedCase.automationStatus}
            />
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={qaReviewRequestCopy.title}>
            <p className="panel-summary">{qaReviewRequestCopy.summary}</p>
            <p className="field-note">{qaSamplingGuardNote}</p>
            <QaReviewRequestForm
              canManage={canManageQaSampling && qaReviewDisplay?.status !== "pending_review"}
              caseId={persistedCase.caseId}
              defaultRequestedByName={persistedCase.ownerName}
              disabledLabel={locale === "ar" ? "يتطلب دوراً مخولاً للجودة" : "QA sampling role required"}
              locale={locale}
              returnPath={`/${locale}/leads/${persistedCase.caseId}`}
            />
          </Panel>

          <Panel title={locale === "ar" ? "حالة مراجعة الجودة" : "QA review status"}>
            {qaReviewDisplay ? (
              <div className="page-stack">
                <div className="row-between">
                  <h3>{qaReviewDisplay.sampleSummary}</h3>
                  <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge>
                </div>
                <div className="status-row-wrap">
                  <StatusBadge>{qaReviewDisplay.subjectTypeLabel}</StatusBadge>
                  <StatusBadge>{qaReviewDisplay.triggerSourceLabel}</StatusBadge>
                  {qaReviewDisplay.policySignalLabels.map((label) => (
                    <StatusBadge key={label}>{label}</StatusBadge>
                  ))}
                </div>
                {qaReviewDisplay.draftMessage ? <p>{qaReviewDisplay.draftMessage}</p> : null}
                <p>{qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}</p>
                {qaReviewDisplay.triggerEvidence.length > 0 ? (
                  <p className="case-link-meta">{qaReviewDisplay.triggerEvidence.join(", ")}</p>
                ) : null}
                <p className="case-link-meta">
                  {qaReviewDisplay.reviewerName ?? qaReviewDisplay.requestedByName}
                  {" · "}
                  {qaReviewDisplay.reviewedAt ?? qaReviewDisplay.updatedAt}
                </p>
                {canAccessQaWorkspace ? (
                  <Link className="inline-link" href={`/${locale}/qa/cases/${persistedCase.caseId}`}>
                    {locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="panel-summary">
                {locale === "ar"
                  ? "لم تُرسل هذه الحالة إلى طابور الجودة بعد."
                  : "This case has not been sent to the QA queue yet."}
              </p>
            )}
          </Panel>
        </div>

        {persistedCase.handoverCase ? (
          <Panel title={locale === "ar" ? "حالة التسليم المرتبطة" : "Linked handover record"}>
            <div className="row-between">
              <div className="stack-tight">
                <h3>{persistedCase.handoverCase.ownerName}</h3>
                <p className="case-link-meta">{buildCaseReferenceCode(persistedCase.handoverCase.handoverCaseId)}</p>
              </div>
              <StatusBadge tone="success">{getPersistedHandoverStatusLabel(locale, persistedCase.handoverCase)}</StatusBadge>
            </div>
            {canAccessHandoverWorkspace ? (
              <Link className="inline-link" href={`/${locale}/handover/${persistedCase.handoverCase.handoverCaseId}`}>
                {locale === "ar" ? "فتح صفحة التسليم" : "Open handover page"}
              </Link>
            ) : null}
          </Panel>
        ) : null}

        <div className="two-column-grid">
          <Panel
            title={
              locale === "ar"
                ? persistedCase.openInterventionsCount > 0
                  ? "التدخلات المفتوحة"
                  : "لا توجد تدخلات مفتوحة"
                : persistedCase.openInterventionsCount > 0
                  ? "Open interventions"
                  : "No open interventions"
            }
          >
            <StatefulStack
              emptySummary={
                locale === "ar"
                  ? "تعمل المتابعة الحالية دون تدخل إداري مفتوح."
                  : "The current follow-up plan is running without an open manager intervention."
              }
              emptyTitle={locale === "ar" ? "لا توجد عناصر مفتوحة" : "Nothing open right now"}
              items={interventionItems.filter((intervention) => intervention.status === "open")}
              renderItem={(intervention) => (
                <article key={intervention.interventionId} className="intervention-row">
                  <div className="row-between">
                    <h3>{intervention.summary}</h3>
                    <StatusBadge tone={intervention.severityTone}>{intervention.severityLabel}</StatusBadge>
                  </div>
                  <p className="case-link-meta">{intervention.createdAt}</p>
                </article>
              )}
            />
          </Panel>

          <Panel title={locale === "ar" ? "سجل التدخلات المحلولة" : "Resolved intervention history"}>
            <StatefulStack
              emptySummary={
                locale === "ar"
                  ? "لم يتم تسجيل تدخلات محلولة لهذه الحالة بعد."
                  : "No resolved intervention history has been recorded for this case yet."
              }
              emptyTitle={locale === "ar" ? "لا يوجد سجل محلول" : "No resolved history yet"}
              items={interventionItems.filter((intervention) => intervention.status === "resolved")}
              renderItem={(intervention) => (
                <article key={intervention.interventionId} className="intervention-row intervention-row-resolved">
                  <div className="row-between">
                    <h3>{intervention.summary}</h3>
                    <StatusBadge>{intervention.severityLabel}</StatusBadge>
                  </div>
                  <p className="case-link-meta">{intervention.resolvedAt ?? intervention.createdAt}</p>
                </article>
              )}
            />
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "ملخص التأهيل الحالي" : "Current qualification"}>
            {qualificationSummary ? (
              <dl className="detail-list">
                <div>
                  <dt>{locale === "ar" ? "نطاق الميزانية" : "Budget band"}</dt>
                  <dd>{qualificationSummary.budgetBand}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "الإطار الزمني" : "Move-in timeline"}</dt>
                  <dd>{qualificationSummary.moveInTimeline}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "الجاهزية" : "Readiness"}</dt>
                  <dd>{qualificationSummary.readiness}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "آخر تحديث" : "Last updated"}</dt>
                  <dd>{qualificationSummary.updatedAt}</dd>
                </div>
                <div>
                  <dt>{locale === "ar" ? "الملخص" : "Summary"}</dt>
                  <dd>{qualificationSummary.intentSummary}</dd>
                </div>
              </dl>
            ) : (
              <p className="panel-summary">
                {locale === "ar"
                  ? "لم يتم حفظ التأهيل بعد. استخدم النموذج المجاور لتسجيل أول شريحة تأهيلية للحالة."
                  : "Qualification has not been saved yet. Use the adjacent form to capture the first structured qualification snapshot."}
              </p>
            )}
          </Panel>

          <Panel title={locale === "ar" ? "تحديث التأهيل" : "Update qualification"}>
            <p className="panel-summary">
              {locale === "ar"
                ? "هذا النموذج يرفع الحالة من عميل جديد إلى عميل مؤهل داخل المسار الحي."
                : "This form moves the live case from a new lead into a qualified state."}
            </p>
            <QualificationForm caseId={persistedCase.caseId} locale={locale} returnPath={`/${locale}/leads/${persistedCase.caseId}`} />
          </Panel>
        </div>

        <TimelinePanel events={buildPersistedTimeline(persistedCase)} locale={locale} />
      </div>
    );
  }

  const caseItem = getDemoCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return (
    <div className="page-stack">
      <ScreenIntro badge={caseItem.referenceCode} summary={getLocalizedText(caseItem.summary, locale)} title={messages.profile.title} />
      <CaseRouteTabs caseId={caseItem.id} handoverCaseId={caseItem.handoverCaseId} locale={locale} />

      <div className="two-column-grid">
        <Panel title={caseItem.customerName}>
          <div className="detail-grid">
            <div>
              <p className="detail-label">{messages.common.stage}</p>
              <StatusBadge>{getLocalizedText(caseItem.stage, locale)}</StatusBadge>
            </div>
            <div>
              <p className="detail-label">{messages.common.currentOwner}</p>
              <p>{caseItem.owner}</p>
            </div>
            <div>
              <p className="detail-label">{messages.common.nextAction}</p>
              <p>{getLocalizedText(caseItem.nextAction, locale)}</p>
            </div>
            <div>
              <p className="detail-label">{messages.common.lastChange}</p>
              <p>{new Date(caseItem.lastMeaningfulChange).toLocaleString(locale)}</p>
            </div>
          </div>
          <div className="case-callout">
            <p>{getLocalizedText(caseItem.budgetLabel, locale)}</p>
            <p>{getLocalizedText(caseItem.attentionNote, locale)}</p>
          </div>
        </Panel>

        <Panel title={messages.common.visitReadiness}>
          <div className="stack-list">
            <div className="case-stack-card">
              <p className="detail-label">{caseItem.visitPlan.scheduledAt}</p>
              <h3>{getLocalizedText(caseItem.visitPlan.location, locale)}</h3>
              <p>{getLocalizedText(caseItem.visitPlan.readinessNote, locale)}</p>
            </div>
          </div>
        </Panel>
      </div>

      <TimelinePanel events={caseItem.timeline} locale={locale} />
      <PlaceholderNotice locale={locale} />
    </div>
  );
}
