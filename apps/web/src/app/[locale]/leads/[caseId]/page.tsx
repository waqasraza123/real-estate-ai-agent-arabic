import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { getDemoCaseById, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  caseStackCardClassName,
  criticalAlertCardClassName,
  detailGridClassName,
  detailLabelClassName,
  DetailGrid,
  DetailItem,
  DetailListItem,
  detailListClassName,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  panelSummaryClassName,
  rowBetweenClassName,
  stackTightClassName,
  StatusBadge,
  statusRowWrapClassName,
  successCardClassName,
  twoColumnGridClassName
} from "@real-estate-ai/ui";

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
import { formatDateTime } from "@/lib/format";
import { getOperatorPermissionGuardNote, getPreferredOperatorSurfacePath } from "@/lib/operator-role";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import {
  buildCaseReferenceCode,
  buildPersistedTimeline,
  formatCaseLastChange,
  formatDueAt,
  formatLatestManagerFollowUpSavedAt,
  formatLatestHumanReplySentAt,
  getPersistedAutomationLabel,
  getPersistedAutomationHoldReasonLabel,
  getPersistedAutomationHoldReasonNote,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverStatusLabel,
  getPersistedInterventionDisplay,
  getPersistedLatestManagerFollowUpLabel,
  getPersistedLatestManagerFollowUpNote,
  getPersistedLatestHumanReplyEscalationLabel,
  getPersistedLatestHumanReplyLabel,
  getPersistedLatestHumanReplyOwnershipLabel,
  getPersistedLatestHumanReplyOwnershipNote,
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
      <div className={pageStackClassName}>
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
    const latestHumanReplyLabel = getPersistedLatestHumanReplyLabel(locale, persistedCase.latestHumanReply);
    const latestHumanReplySentAt = formatLatestHumanReplySentAt(persistedCase.latestHumanReply, locale);
    const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(
      locale,
      persistedCase.ownerName,
      persistedCase.latestHumanReply
    );
    const latestHumanReplyOwnershipNote = getPersistedLatestHumanReplyOwnershipNote(
      locale,
      persistedCase.ownerName,
      persistedCase.latestHumanReply
    );
    const latestManagerFollowUpLabel = getPersistedLatestManagerFollowUpLabel(locale, persistedCase.latestManagerFollowUp);
    const latestManagerFollowUpSavedAt = formatLatestManagerFollowUpSavedAt(persistedCase.latestManagerFollowUp, locale);
    const latestManagerFollowUpNote = getPersistedLatestManagerFollowUpNote(locale, persistedCase.latestManagerFollowUp);
    const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
      locale,
      persistedCase.ownerName,
      persistedCase.latestHumanReply,
      persistedCase.followUpStatus,
      persistedCase.openInterventionsCount
    );

    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={buildCaseReferenceCode(persistedCase.caseId)} summary={persistedCase.message} title={messages.profile.title} />
        <CaseRouteTabs caseId={persistedCase.caseId} handoverCaseId={persistedCase.handoverCase?.handoverCaseId} locale={locale} />

        <div className={twoColumnGridClassName}>
          <Panel title={persistedCase.customerName}>
            <DetailGrid>
              <DetailItem label={messages.common.stage} value={<StatusBadge>{getPersistedCaseStageLabel(locale, persistedCase.stage)}</StatusBadge>} />
              <DetailItem label={messages.common.currentOwner} value={persistedCase.ownerName} />
              <DetailItem label={messages.common.nextAction} value={persistedCase.nextAction} />
              <DetailItem label={locale === "ar" ? "موعد المتابعة" : "Follow-up due"} value={formatDueAt(persistedCase, locale)} />
              <DetailItem label={messages.common.lastChange} value={formatCaseLastChange(persistedCase, locale)} />
              <DetailItem label={locale === "ar" ? "مصدر الحالة" : "Lead source"} value={getPersistedSourceLabel(locale)} />
            </DetailGrid>
            <div className={`mt-5 ${statusRowWrapClassName}`}>
              <StatusBadge tone={persistedCase.followUpStatus === "attention" ? "critical" : "success"}>
                {getPersistedFollowUpLabel(locale, persistedCase)}
              </StatusBadge>
              <StatusBadge>{getPersistedAutomationLabel(locale, persistedCase.automationStatus)}</StatusBadge>
              {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
              {persistedCase.openInterventionsCount > 0 ? (
                <StatusBadge tone="warning">{getInterventionCountLabel(locale, persistedCase.openInterventionsCount)}</StatusBadge>
              ) : null}
            </div>
            <div className="mt-5 rounded-4xl border border-brand-100/80 bg-brand-50/70 p-4 text-sm leading-7 text-ink-soft">
              <p>{persistedCase.budget ?? persistedCase.projectInterest}</p>
              <p>{persistedCase.projectInterest}</p>
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "التفاصيل الأساسية" : "Core intake details"}>
            <dl className={detailListClassName}>
              <DetailListItem label={locale === "ar" ? "البريد الإلكتروني" : "Email"} value={persistedCase.email} />
              <DetailListItem label={locale === "ar" ? "الهاتف" : "Phone"} value={persistedCase.phone ?? "—"} />
              <DetailListItem label={locale === "ar" ? "المشروع المطلوب" : "Project interest"} value={persistedCase.projectInterest} />
              <DetailListItem label={locale === "ar" ? "لغة العميل" : "Customer language"} value={persistedCase.preferredLocale === "ar" ? "العربية" : "English"} />
            </dl>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={followUpManagerCopy.title}>
            <div className="mt-4 space-y-4">
              <p className={panelSummaryClassName}>{followUpManagerCopy.summary}</p>
              <p className="text-sm leading-7 text-ink-soft">{followUpGuardNote}</p>
            {persistedCase.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
              <div className="space-y-3">
                <StatusBadge>{latestManagerFollowUpLabel}</StatusBadge>
                <p className="text-sm leading-7 text-ink-soft">
                  {persistedCase.latestManagerFollowUp.ownerName}
                  {" · "}
                  {latestManagerFollowUpSavedAt}
                </p>
                {latestManagerFollowUpNote ? <p className="text-sm leading-7 text-ink-soft">{latestManagerFollowUpNote}</p> : null}
              </div>
            ) : null}
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
            </div>
          </Panel>

          <Panel title={automationCopy.title}>
            <div className="mt-4 space-y-4">
              <p className={panelSummaryClassName}>{automationCopy.summary}</p>
              <p className="text-sm leading-7 text-ink-soft">{automationGuardNote}</p>
              {automationHoldReasonNote ? <p className="text-sm leading-7 text-ink-soft">{automationHoldReasonNote}</p> : null}
              <AutomationStatusForm
                canManage={canManageAutomation}
                caseId={persistedCase.caseId}
                disabledLabel={locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}`}
                status={persistedCase.automationStatus}
              />
            </div>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "آخر رد بشري" : "Latest human reply"}>
            {persistedCase.latestHumanReply ? (
              <div className="mt-4 space-y-4">
                <div className={rowBetweenClassName}>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{persistedCase.latestHumanReply.sentByName}</h3>
                  {latestHumanReplyLabel ? <StatusBadge tone="success">{latestHumanReplyLabel}</StatusBadge> : null}
                </div>
                {latestHumanReplyOwnershipLabel ? <StatusBadge>{latestHumanReplyOwnershipLabel}</StatusBadge> : null}
                {latestHumanReplyEscalationLabel ? <StatusBadge tone="warning">{latestHumanReplyEscalationLabel}</StatusBadge> : null}
                <p className="text-sm leading-7 text-ink-soft">{persistedCase.latestHumanReply.message}</p>
                <dl className={detailListClassName}>
                  <div>
                    <dt className={detailLabelClassName}>{locale === "ar" ? "وقت الإرسال" : "Sent at"}</dt>
                    <dd className="mt-1 text-sm leading-7 text-ink">{latestHumanReplySentAt}</dd>
                  </div>
                  <div>
                    <dt className={detailLabelClassName}>{locale === "ar" ? "الخطوة التالية المحفوظة" : "Saved next action"}</dt>
                    <dd className="mt-1 text-sm leading-7 text-ink">{persistedCase.latestHumanReply.nextAction}</dd>
                  </div>
                  <div>
                    <dt className={detailLabelClassName}>{locale === "ar" ? "موعد الخطوة التالية" : "Next action due"}</dt>
                    <dd className="mt-1 text-sm leading-7 text-ink">
                      {formatDateTime(persistedCase.latestHumanReply.nextActionDueAt, locale)}
                    </dd>
                  </div>
                </dl>
                {latestHumanReplyOwnershipNote ? <p className="text-sm leading-7 text-ink-soft">{latestHumanReplyOwnershipNote}</p> : null}
              </div>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "لم يُسجل على هذه الحالة أي رد بشري بعد."
                  : "No human reply has been recorded on this case yet."}
              </p>
            )}
          </Panel>

          <Panel title={qaReviewRequestCopy.title}>
            <div className="mt-4 space-y-4">
              <p className={panelSummaryClassName}>{qaReviewRequestCopy.summary}</p>
              <p className="text-sm leading-7 text-ink-soft">{qaSamplingGuardNote}</p>
              <QaReviewRequestForm
                canManage={canManageQaSampling && qaReviewDisplay?.status !== "pending_review"}
                caseId={persistedCase.caseId}
                defaultRequestedByName={persistedCase.ownerName}
                disabledLabel={locale === "ar" ? "يتطلب دوراً مخولاً للجودة" : "QA sampling role required"}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}`}
              />
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "حالة مراجعة الجودة" : "QA review status"}>
            {qaReviewDisplay ? (
              <div className="mt-4 space-y-4">
                <div className={rowBetweenClassName}>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{qaReviewDisplay.sampleSummary}</h3>
                  <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge>
                </div>
                <div className={statusRowWrapClassName}>
                  <StatusBadge>{qaReviewDisplay.subjectTypeLabel}</StatusBadge>
                  <StatusBadge>{qaReviewDisplay.triggerSourceLabel}</StatusBadge>
                  {qaReviewDisplay.policySignalLabels.map((label) => (
                    <StatusBadge key={label}>{label}</StatusBadge>
                  ))}
                </div>
                {qaReviewDisplay.draftMessage ? <p className="text-sm leading-7 text-ink-soft">{qaReviewDisplay.draftMessage}</p> : null}
                <p className="text-sm leading-7 text-ink-soft">{qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}</p>
                {qaReviewDisplay.triggerEvidence.length > 0 ? (
                  <p className={caseMetaClassName}>{qaReviewDisplay.triggerEvidence.join(", ")}</p>
                ) : null}
                <p className={caseMetaClassName}>
                  {qaReviewDisplay.reviewerName ?? qaReviewDisplay.requestedByName}
                  {" · "}
                  {qaReviewDisplay.reviewedAt ?? qaReviewDisplay.updatedAt}
                </p>
                {canAccessQaWorkspace ? (
                  <Link className={inlineLinkClassName} href={`/${locale}/qa/cases/${persistedCase.caseId}`}>
                    {locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "لم تُرسل هذه الحالة إلى طابور الجودة بعد."
                  : "This case has not been sent to the QA queue yet."}
              </p>
            )}
          </Panel>
        </div>

        {persistedCase.handoverCase ? (
          <Panel title={locale === "ar" ? "حالة التسليم المرتبطة" : "Linked handover record"}>
            <div className={`mt-4 ${rowBetweenClassName}`}>
              <div className={stackTightClassName}>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{persistedCase.handoverCase.ownerName}</h3>
                <p className={caseMetaClassName}>{buildCaseReferenceCode(persistedCase.handoverCase.handoverCaseId)}</p>
              </div>
              <StatusBadge tone="success">{getPersistedHandoverStatusLabel(locale, persistedCase.handoverCase)}</StatusBadge>
            </div>
            {canAccessHandoverWorkspace ? (
              <Link className={`mt-4 ${inlineLinkClassName}`} href={`/${locale}/handover/${persistedCase.handoverCase.handoverCaseId}`}>
                {locale === "ar" ? "فتح صفحة التسليم" : "Open handover page"}
              </Link>
            ) : null}
          </Panel>
        ) : null}

        <div className={twoColumnGridClassName}>
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
                <article key={intervention.interventionId} className={criticalAlertCardClassName}>
                  <div className={rowBetweenClassName}>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{intervention.summary}</h3>
                    <StatusBadge tone={intervention.severityTone}>{intervention.severityLabel}</StatusBadge>
                  </div>
                  <p className={`mt-3 ${caseMetaClassName}`}>{intervention.createdAt}</p>
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
                <article key={intervention.interventionId} className={successCardClassName}>
                  <div className={rowBetweenClassName}>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{intervention.summary}</h3>
                    <StatusBadge>{intervention.severityLabel}</StatusBadge>
                  </div>
                  <p className={`mt-3 ${caseMetaClassName}`}>{intervention.resolvedAt ?? intervention.createdAt}</p>
                </article>
              )}
            />
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "ملخص التأهيل الحالي" : "Current qualification"}>
            {qualificationSummary ? (
              <dl className={detailListClassName}>
                <div>
                  <dt className={detailLabelClassName}>{locale === "ar" ? "نطاق الميزانية" : "Budget band"}</dt>
                  <dd className="mt-1 text-sm leading-7 text-ink">{qualificationSummary.budgetBand}</dd>
                </div>
                <div>
                  <dt className={detailLabelClassName}>{locale === "ar" ? "الإطار الزمني" : "Move-in timeline"}</dt>
                  <dd className="mt-1 text-sm leading-7 text-ink">{qualificationSummary.moveInTimeline}</dd>
                </div>
                <div>
                  <dt className={detailLabelClassName}>{locale === "ar" ? "الجاهزية" : "Readiness"}</dt>
                  <dd className="mt-1 text-sm leading-7 text-ink">{qualificationSummary.readiness}</dd>
                </div>
                <div>
                  <dt className={detailLabelClassName}>{locale === "ar" ? "آخر تحديث" : "Last updated"}</dt>
                  <dd className="mt-1 text-sm leading-7 text-ink">{qualificationSummary.updatedAt}</dd>
                </div>
                <div>
                  <dt className={detailLabelClassName}>{locale === "ar" ? "الملخص" : "Summary"}</dt>
                  <dd className="mt-1 text-sm leading-7 text-ink">{qualificationSummary.intentSummary}</dd>
                </div>
              </dl>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "لم يتم حفظ التأهيل بعد. استخدم النموذج المجاور لتسجيل أول شريحة تأهيلية للحالة."
                  : "Qualification has not been saved yet. Use the adjacent form to capture the first structured qualification snapshot."}
              </p>
            )}
          </Panel>

          <Panel title={locale === "ar" ? "تحديث التأهيل" : "Update qualification"}>
            <p className={panelSummaryClassName}>
              {locale === "ar"
                ? "هذا النموذج يرفع الحالة من عميل جديد إلى عميل مؤهل داخل المسار الحي."
                : "This form moves the live case from a new lead into a qualified state."}
            </p>
            <div className="mt-4">
              <QualificationForm caseId={persistedCase.caseId} locale={locale} returnPath={`/${locale}/leads/${persistedCase.caseId}`} />
            </div>
          </Panel>
        </div>

        <TimelinePanel events={buildPersistedTimeline(persistedCase, locale)} locale={locale} />
      </div>
    );
  }

  const caseItem = getDemoCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={caseItem.referenceCode} summary={getLocalizedText(caseItem.summary, locale)} title={messages.profile.title} />
      <CaseRouteTabs caseId={caseItem.id} handoverCaseId={caseItem.handoverCaseId} locale={locale} />

      <div className={twoColumnGridClassName}>
        <Panel title={caseItem.customerName}>
          <div className={detailGridClassName}>
            <div>
              <p className={detailLabelClassName}>{messages.common.stage}</p>
              <StatusBadge>{getLocalizedText(caseItem.stage, locale)}</StatusBadge>
            </div>
            <div>
              <p className={detailLabelClassName}>{messages.common.currentOwner}</p>
              <p className="text-sm leading-7 text-ink">{caseItem.owner}</p>
            </div>
            <div>
              <p className={detailLabelClassName}>{messages.common.nextAction}</p>
              <p className="text-sm leading-7 text-ink">{getLocalizedText(caseItem.nextAction, locale)}</p>
            </div>
            <div>
              <p className={detailLabelClassName}>{messages.common.lastChange}</p>
              <p className="text-sm leading-7 text-ink">{formatDateTime(caseItem.lastMeaningfulChange, locale)}</p>
            </div>
          </div>
          <div className="mt-5 rounded-4xl border border-brand-100/80 bg-brand-50/70 p-4 text-sm leading-7 text-ink-soft">
            <p>{getLocalizedText(caseItem.budgetLabel, locale)}</p>
            <p>{getLocalizedText(caseItem.attentionNote, locale)}</p>
          </div>
        </Panel>

        <Panel title={messages.common.visitReadiness}>
          <div className="mt-4">
            <div className={caseStackCardClassName}>
              <p className={detailLabelClassName}>{caseItem.visitPlan.scheduledAt}</p>
              <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{getLocalizedText(caseItem.visitPlan.location, locale)}</h3>
              <p className="text-sm leading-7 text-ink-soft">{getLocalizedText(caseItem.visitPlan.readinessNote, locale)}</p>
            </div>
          </div>
        </Panel>
      </div>

      <TimelinePanel events={caseItem.timeline} locale={locale} />
      <PlaceholderNotice locale={locale} />
    </div>
  );
}
