import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { getDemoCaseById, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  detailLabelClassName,
  DetailGrid,
  DetailItem,
  DetailListItem,
  detailListClassName,
  HighlightNotice,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  StatusBadge,
  statusRowWrapClassName,
  twoColumnGridClassName,
  WorkflowCard,
  WorkflowPanelBody
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
            <WorkflowPanelBody className="mt-4">
              <DetailGrid>
                <DetailItem label={messages.common.stage} value={<StatusBadge>{getPersistedCaseStageLabel(locale, persistedCase.stage)}</StatusBadge>} />
                <DetailItem label={messages.common.currentOwner} value={persistedCase.ownerName} />
                <DetailItem label={messages.common.nextAction} value={persistedCase.nextAction} />
                <DetailItem label={locale === "ar" ? "موعد المتابعة" : "Follow-up due"} value={formatDueAt(persistedCase, locale)} />
                <DetailItem label={messages.common.lastChange} value={formatCaseLastChange(persistedCase, locale)} />
                <DetailItem label={locale === "ar" ? "مصدر الحالة" : "Lead source"} value={getPersistedSourceLabel(locale)} />
              </DetailGrid>
              <div className={statusRowWrapClassName}>
                <StatusBadge tone={persistedCase.followUpStatus === "attention" ? "critical" : "success"}>
                  {getPersistedFollowUpLabel(locale, persistedCase)}
                </StatusBadge>
                <StatusBadge>{getPersistedAutomationLabel(locale, persistedCase.automationStatus)}</StatusBadge>
                {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
                {persistedCase.openInterventionsCount > 0 ? (
                  <StatusBadge tone="warning">{getInterventionCountLabel(locale, persistedCase.openInterventionsCount)}</StatusBadge>
                ) : null}
              </div>
              <HighlightNotice>
                <p>{persistedCase.budget ?? persistedCase.projectInterest}</p>
                <p>{persistedCase.projectInterest}</p>
              </HighlightNotice>
            </WorkflowPanelBody>
          </Panel>

          <Panel title={locale === "ar" ? "التفاصيل الأساسية" : "Core intake details"}>
            <WorkflowPanelBody className="mt-4">
              <dl className={detailListClassName}>
                <DetailListItem label={locale === "ar" ? "البريد الإلكتروني" : "Email"} value={persistedCase.email} />
                <DetailListItem label={locale === "ar" ? "الهاتف" : "Phone"} value={persistedCase.phone ?? "—"} />
                <DetailListItem label={locale === "ar" ? "المشروع المطلوب" : "Project interest"} value={persistedCase.projectInterest} />
                <DetailListItem label={locale === "ar" ? "لغة العميل" : "Customer language"} value={persistedCase.preferredLocale === "ar" ? "العربية" : "English"} />
              </dl>
            </WorkflowPanelBody>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={followUpManagerCopy.title}>
            <WorkflowPanelBody className="mt-4" note={followUpGuardNote} summary={followUpManagerCopy.summary}>
              {persistedCase.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
                <WorkflowCard
                  badges={<StatusBadge>{latestManagerFollowUpLabel}</StatusBadge>}
                  meta={
                    <p className={caseMetaClassName}>
                      {persistedCase.latestManagerFollowUp.ownerName}
                      {" · "}
                      {latestManagerFollowUpSavedAt}
                    </p>
                  }
                  summary={latestManagerFollowUpNote}
                  title={locale === "ar" ? "آخر تحديث إداري" : "Latest manager follow-up"}
                />
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
            </WorkflowPanelBody>
          </Panel>

          <Panel title={automationCopy.title}>
            <WorkflowPanelBody className="mt-4" note={automationGuardNote} summary={automationCopy.summary}>
              {automationHoldReasonNote ? <HighlightNotice tone="warning">{automationHoldReasonNote}</HighlightNotice> : null}
              <AutomationStatusForm
                canManage={canManageAutomation}
                caseId={persistedCase.caseId}
                disabledLabel={locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}`}
                status={persistedCase.automationStatus}
              />
            </WorkflowPanelBody>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "آخر رد بشري" : "Latest human reply"}>
            {persistedCase.latestHumanReply ? (
              <WorkflowPanelBody className="mt-4">
                <WorkflowCard
                  badges={
                    <>
                      {latestHumanReplyLabel ? <StatusBadge tone="success">{latestHumanReplyLabel}</StatusBadge> : null}
                      {latestHumanReplyOwnershipLabel ? <StatusBadge>{latestHumanReplyOwnershipLabel}</StatusBadge> : null}
                      {latestHumanReplyEscalationLabel ? <StatusBadge tone="warning">{latestHumanReplyEscalationLabel}</StatusBadge> : null}
                    </>
                  }
                  meta={<p className={caseMetaClassName}>{persistedCase.latestHumanReply.sentByName}</p>}
                  summary={persistedCase.latestHumanReply.message}
                  title={locale === "ar" ? "تفاصيل الرد الحالي" : "Current reply details"}
                  tone="success"
                >
                  <dl className={detailListClassName}>
                    <DetailListItem label={locale === "ar" ? "وقت الإرسال" : "Sent at"} value={latestHumanReplySentAt} />
                    <DetailListItem label={locale === "ar" ? "الخطوة التالية المحفوظة" : "Saved next action"} value={persistedCase.latestHumanReply.nextAction} />
                    <DetailListItem
                      label={locale === "ar" ? "موعد الخطوة التالية" : "Next action due"}
                      value={formatDateTime(persistedCase.latestHumanReply.nextActionDueAt, locale)}
                    />
                  </dl>
                  {latestHumanReplyOwnershipNote ? <p className={caseMetaClassName}>{latestHumanReplyOwnershipNote}</p> : null}
                </WorkflowCard>
              </WorkflowPanelBody>
            ) : (
              <WorkflowPanelBody
                summary={
                  locale === "ar"
                    ? "لم يُسجل على هذه الحالة أي رد بشري بعد."
                    : "No human reply has been recorded on this case yet."
                }
              />
            )}
          </Panel>

          <Panel title={qaReviewRequestCopy.title}>
            <WorkflowPanelBody className="mt-4" note={qaSamplingGuardNote} summary={qaReviewRequestCopy.summary}>
              <QaReviewRequestForm
                canManage={canManageQaSampling && qaReviewDisplay?.status !== "pending_review"}
                caseId={persistedCase.caseId}
                defaultRequestedByName={persistedCase.ownerName}
                disabledLabel={locale === "ar" ? "يتطلب دوراً مخولاً للجودة" : "QA sampling role required"}
                locale={locale}
                returnPath={`/${locale}/leads/${persistedCase.caseId}`}
              />
            </WorkflowPanelBody>
          </Panel>

          <Panel title={locale === "ar" ? "حالة مراجعة الجودة" : "QA review status"}>
            {qaReviewDisplay ? (
              <WorkflowPanelBody className="mt-4">
                <WorkflowCard
                  actions={
                    canAccessQaWorkspace ? (
                      <Link className={inlineLinkClassName} href={`/${locale}/qa/cases/${persistedCase.caseId}`}>
                        {locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    ) : null
                  }
                  badges={
                    <>
                      <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge>
                      <StatusBadge>{qaReviewDisplay.subjectTypeLabel}</StatusBadge>
                      <StatusBadge>{qaReviewDisplay.triggerSourceLabel}</StatusBadge>
                      {qaReviewDisplay.policySignalLabels.map((label) => (
                        <StatusBadge key={label}>{label}</StatusBadge>
                      ))}
                    </>
                  }
                  meta={
                    <p className={caseMetaClassName}>
                      {qaReviewDisplay.reviewerName ?? qaReviewDisplay.requestedByName}
                      {" · "}
                      {qaReviewDisplay.reviewedAt ?? qaReviewDisplay.updatedAt}
                    </p>
                  }
                  summary={qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}
                  title={qaReviewDisplay.sampleSummary}
                >
                  {qaReviewDisplay.draftMessage ? <p className="text-sm leading-7 text-ink-soft">{qaReviewDisplay.draftMessage}</p> : null}
                  {qaReviewDisplay.triggerEvidence.length > 0 ? (
                    <p className={caseMetaClassName}>{qaReviewDisplay.triggerEvidence.join(", ")}</p>
                  ) : null}
                </WorkflowCard>
              </WorkflowPanelBody>
            ) : (
              <WorkflowPanelBody
                summary={
                  locale === "ar"
                    ? "لم تُرسل هذه الحالة إلى طابور الجودة بعد."
                    : "This case has not been sent to the QA queue yet."
                }
              />
            )}
          </Panel>
        </div>

        {persistedCase.handoverCase ? (
          <Panel title={locale === "ar" ? "حالة التسليم المرتبطة" : "Linked handover record"}>
            <WorkflowPanelBody className="mt-4">
              <WorkflowCard
                actions={
                  canAccessHandoverWorkspace ? (
                    <Link className={inlineLinkClassName} href={`/${locale}/handover/${persistedCase.handoverCase.handoverCaseId}`}>
                      {locale === "ar" ? "فتح صفحة التسليم" : "Open handover page"}
                    </Link>
                  ) : null
                }
                badges={<StatusBadge tone="success">{getPersistedHandoverStatusLabel(locale, persistedCase.handoverCase)}</StatusBadge>}
                meta={<p className={caseMetaClassName}>{buildCaseReferenceCode(persistedCase.handoverCase.handoverCaseId)}</p>}
                summary={locale === "ar" ? "سجل التسليم المرتبط متاح الآن من هذا الملف." : "The linked handover record is now available from this profile."}
                title={persistedCase.handoverCase.ownerName}
                tone="success"
              />
            </WorkflowPanelBody>
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
                <WorkflowCard
                  key={intervention.interventionId}
                  badges={<StatusBadge tone={intervention.severityTone}>{intervention.severityLabel}</StatusBadge>}
                  meta={<p className={caseMetaClassName}>{intervention.createdAt}</p>}
                  title={intervention.summary}
                  tone="critical"
                />
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
                <WorkflowCard
                  key={intervention.interventionId}
                  badges={<StatusBadge>{intervention.severityLabel}</StatusBadge>}
                  meta={<p className={caseMetaClassName}>{intervention.resolvedAt ?? intervention.createdAt}</p>}
                  title={intervention.summary}
                  tone="success"
                />
              )}
            />
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "ملخص التأهيل الحالي" : "Current qualification"}>
            {qualificationSummary ? (
              <WorkflowPanelBody className="mt-4">
                <dl className={detailListClassName}>
                  <DetailListItem label={locale === "ar" ? "نطاق الميزانية" : "Budget band"} value={qualificationSummary.budgetBand} />
                  <DetailListItem label={locale === "ar" ? "الإطار الزمني" : "Move-in timeline"} value={qualificationSummary.moveInTimeline} />
                  <DetailListItem label={locale === "ar" ? "الجاهزية" : "Readiness"} value={qualificationSummary.readiness} />
                  <DetailListItem label={locale === "ar" ? "آخر تحديث" : "Last updated"} value={qualificationSummary.updatedAt} />
                  <DetailListItem label={locale === "ar" ? "الملخص" : "Summary"} value={qualificationSummary.intentSummary} />
                </dl>
              </WorkflowPanelBody>
            ) : (
              <WorkflowPanelBody
                summary={
                  locale === "ar"
                    ? "لم يتم حفظ التأهيل بعد. استخدم النموذج المجاور لتسجيل أول شريحة تأهيلية للحالة."
                    : "Qualification has not been saved yet. Use the adjacent form to capture the first structured qualification snapshot."
                }
              />
            )}
          </Panel>

          <Panel title={locale === "ar" ? "تحديث التأهيل" : "Update qualification"}>
            <WorkflowPanelBody
              className="mt-4"
              summary={
                locale === "ar"
                  ? "هذا النموذج يرفع الحالة من عميل جديد إلى عميل مؤهل داخل المسار الحي."
                  : "This form moves the live case from a new lead into a qualified state."
              }
            >
              <QualificationForm caseId={persistedCase.caseId} locale={locale} returnPath={`/${locale}/leads/${persistedCase.caseId}`} />
            </WorkflowPanelBody>
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
          <WorkflowPanelBody className="mt-4">
            <DetailGrid>
              <DetailItem label={messages.common.stage} value={<StatusBadge>{getLocalizedText(caseItem.stage, locale)}</StatusBadge>} />
              <DetailItem label={messages.common.currentOwner} value={caseItem.owner} />
              <DetailItem label={messages.common.nextAction} value={getLocalizedText(caseItem.nextAction, locale)} />
              <DetailItem label={messages.common.lastChange} value={formatDateTime(caseItem.lastMeaningfulChange, locale)} />
            </DetailGrid>
            <HighlightNotice>
              <p>{getLocalizedText(caseItem.budgetLabel, locale)}</p>
              <p>{getLocalizedText(caseItem.attentionNote, locale)}</p>
            </HighlightNotice>
          </WorkflowPanelBody>
        </Panel>

        <Panel title={messages.common.visitReadiness}>
          <WorkflowPanelBody className="mt-4">
            <WorkflowCard
              meta={<p className={detailLabelClassName}>{caseItem.visitPlan.scheduledAt}</p>}
              summary={getLocalizedText(caseItem.visitPlan.readinessNote, locale)}
              title={getLocalizedText(caseItem.visitPlan.location, locale)}
            />
          </WorkflowPanelBody>
        </Panel>
      </div>

      <TimelinePanel events={caseItem.timeline} locale={locale} />
      <PlaceholderNotice locale={locale} />
    </div>
  );
}
